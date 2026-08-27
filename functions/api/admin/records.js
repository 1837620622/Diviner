// 玄机子 · 管理后台记录接口
// 只允许通过 ADMIN_PASSWORD 访问；单次最多加载 250 条，避免 KV 子请求过量。

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: HEADERS });
}

async function listAllKeys(kv, prefix, maxKeys = 5000) {
  let cursor;
  const keys = [];
  do {
    const page = await kv.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    keys.push(...page.keys);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor && keys.length < maxKeys);
  return keys.slice(0, maxKeys);
}

// 口令比对先各做 SHA-256 摘要再 timingSafeEqual，长度恒定，抵御时差侧信道。
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ha = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const hb = await crypto.subtle.digest('SHA-256', enc.encode(b));
  return crypto.subtle.timingSafeEqual(ha, hb);
}

export async function onRequestGet({ request, env }) {
  const expected = String(env.ADMIN_PASSWORD || '').trim();
  if (!expected) return json({ error: '管理后台尚未配置 ADMIN_PASSWORD' }, 503);

  const supplied = String(request.headers.get('X-Admin-Password') || '').trim();
  if (!supplied || !(await safeEqual(supplied, expected))) return json({ error: '未授权访问' }, 401);

  if (!env.CHAT_LOGS) {
    return json({ records: [], stats: { total: 0, today: 0, uniqueIPs: 0, loaded: 0 }, dateRange: { min: null, max: null, available: [] } });
  }

  try {
    const url = new URL(request.url);
    const loadAll = url.searchParams.get('all') === 'true';
    const today = new Date().toISOString().slice(0, 10);
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : today;
    const requestedLimit = Number(url.searchParams.get('limit') || 200);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 200, 1), 250);

    const allKeys = await listAllKeys(env.CHAT_LOGS, 'chat_', 5000);
    const dates = [...new Set(allKeys.map((k) => k.name.match(/^chat_(\d{4}-\d{2}-\d{2})_/)?.[1]).filter(Boolean))].sort();

    let candidate = loadAll ? allKeys : allKeys.filter((k) => k.name.startsWith(`chat_${targetDate}_`));
    candidate = candidate.sort((a, b) => b.name.localeCompare(a.name)).slice(0, limit);

    // 可选按模型筛选：匹配前台模型代号 modelId，或上游真实模型名 model。
    const modelFilter = String(url.searchParams.get('model') || '').trim();

    // 并发读取所选记录，替代逐条串行 await，显著降低后台加载时延。
    const fetched = await Promise.all(candidate.map((key) => env.CHAT_LOGS.get(key.name, { type: 'json' })));
    const records = fetched.filter(Boolean).filter((rec) =>
      !modelFilter || rec.modelId === modelFilter || rec.model === modelFilter
    );

    const uniqueIPs = new Set(records.map((r) => r.ip).filter(Boolean)).size;
    const todayCount = allKeys.filter((k) => k.name.startsWith(`chat_${today}_`)).length;

    return json({
      records,
      stats: { total: allKeys.length, today: todayCount, uniqueIPs, loaded: records.length, capped: allKeys.length >= 5000 },
      dateRange: { min: dates[0] || null, max: dates[dates.length - 1] || null, available: dates },
    });
  } catch (error) {
    return json({ error: '获取记录失败', detail: String(error?.message || error).slice(0, 200) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password' } });
}
