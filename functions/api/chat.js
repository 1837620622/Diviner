// Cloudflare Pages Function - 单线路 + 自动路由 + 兜底
// 密钥通过环境变量注入，不落地仓库
// 支持：纯文本走 nemotron-3-ultra，图片走 mimo-v2.5，自动兜底
// 环境变量：
//   API_BASE_URL  默认 https://freeai.chuankangkk.top/v1
//   API_KEY       必填（OpenAI兼容）
//   FALLBACK_ENABLED 默认 true

const DEFAULT_BASE = 'https://freeai.chuankangkk.top/v1';

// 模型路由表：单线路对外无感知，后端自动选择
const ROUTING = {
  text: {
    primary: 'nemotron-3-ultra-free',
    fallbacks: ['mimo-v2.5-free', 'laguna-s-2.1-free'],
  },
  vision: {
    primary: 'mimo-v2.5-free',
    fallbacks: ['nemotron-3-ultra-free', 'laguna-s-2.1-free'],
  },
};

// 检测消息中是否包含图片（OpenAI兼容的 content 数组格式）
function hasImageContent(messages) {
  for (const m of messages || []) {
    const c = m.content;
    if (Array.isArray(c)) {
      for (const part of c) {
        if (part.type === 'image_url' && part.image_url?.url) return true;
      }
    } else if (typeof c === 'string' && c.includes('data:image')) {
      return true;
    }
  }
  return false;
}

// 规范化图片消息：限制大小，保留最多3张，单张不超过 ~4MB base64
function normalizeMessages(messages) {
  let imageCount = 0;
  return (messages || []).map((m) => {
    if (!Array.isArray(m.content)) return m;
    const parts = [];
    for (const p of m.content) {
      if (p.type === 'image_url') {
        if (imageCount >= 3) continue;
        const url = p.image_url?.url || '';
        // 过滤過大 base64（>5MB 直接丢棄，提示由前端壓縮）
        if (url.length > 5 * 1024 * 1024) continue;
        imageCount++;
        parts.push(p);
      } else {
        parts.push(p);
      }
    }
    return { ...m, content: parts };
  });
}

async function callUpstream({ base, key, model, body, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal,
    });
    const data = await resp.json().catch(() => ({}));
    return { resp, data };
  } finally {
    clearTimeout(t);
  }
}

function pickRoute(messages) {
  return hasImageContent(messages) ? ROUTING.vision : ROUTING.text;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const API_BASE = (env.API_BASE_URL || env.ANTHROPIC_BASE_URL || DEFAULT_BASE).trim();
  const API_KEY = (env.API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || '').trim();

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API_KEY 未配置，请在 Cloudflare Pages 环境变量中设置 API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // 获取 IP 与地理（仅用于人设的“掐指一算”，不泄露技术细节）
  let clientIP =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  if (clientIP.startsWith('::ffff:')) clientIP = clientIP.slice(7);

  let locationText = '未知位置';
  try {
    const geoResp = await fetch(`https://api.vore.top/api/IPdata?ip=${encodeURIComponent(clientIP)}`, { signal: AbortSignal.timeout(2500) });
    if (geoResp.ok) {
      const geo = await geoResp.json();
      if (geo.code === 200 && geo.adcode) {
        const o = geo.adcode.o || '';
        const r = geo.adcode.r || '';
        if (o && !o.startsWith('市市') && o.length > 5) locationText = o;
        else if (r) locationText = r;
      }
    }
  } catch {
    const cc = request.headers.get('CF-IPCountry') || '';
    const city = request.cf?.city || '';
    locationText = [cc, city].filter(Boolean).join(' ') || '未知位置';
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体不是合法 JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // 兼容旧前端仍传 route 的情況：直接忽略，后端自动路由
  const rawMessages = body.messages || [];
  const messages = normalizeMessages(rawMessages);
  const isVision = hasImageContent(messages);
  const route = pickRoute(messages);

  // 兼容旧前端传 temperature / max_tokens，没有则用合理默认
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.75;
  const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 1800;
  const top_p = typeof body.top_p === 'number' ? body.top_p : 0.9;

  // 构造上游请求体：只透传必要字段，不把 route 等杂字段带上去
  const upstreamBaseBody = {
    messages,
    temperature,
    max_tokens,
    top_p,
    stream: false,
  };

  const candidates = [route.primary, ...route.fallbacks];
  let lastError = null;
  let lastData = null;
  let usedModel = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const { resp, data } = await callUpstream({ base: API_BASE, key: API_KEY, model, body: upstreamBaseBody, timeoutMs: 30000 });

      // 成功
      if (resp.ok && data.choices && data.choices[0]?.message) {
        usedModel = model;
        lastData = data;
        break;
      }

      // 429 / 5xx 触发兜底，其他 400 视情况兜底
      const isRetryable = resp.status === 429 || resp.status >= 500 || resp.status === 400;
      lastError = { status: resp.status, data };
      lastData = data;

      // 400 且明确是 image 不支持：若当前是 vision 主模型，继续兜底；否则不再重试
      if (resp.status === 400 && String(JSON.stringify(data)).includes('image')) {
        // 有图片但模型不支持 image，继续下一个候选（虽然最终仍可能失败，但可尝试文字兜底提示）
        if (i < candidates.length - 1) continue;
      }

      if (!isRetryable) break;
      if (i < candidates.length - 1) {
        // 轻微退避
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    } catch (e) {
      lastError = { status: 0, message: e.message || String(e) };
      if (i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    }
  }

  // 若全部失败，返回友好兜底（前端会以 assistant 消息形式展示）
  if (!lastData || !lastData.choices || !lastData.choices[0]?.message) {
    const detail = lastError ? JSON.stringify(lastError).slice(0, 800) : '未知错误';
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                '天机暂晦，方才一试未得正解。\n\n' +
                '可能原因：上游模型繁忙或图片过大。\n\n' +
                '建议：\n' +
                '1）若上传了图片，请将图片压缩至 2MB 以内，或先以文字描述面相手纹、房宅朝向；\n' +
                '2）稍候 10 秒后重试；\n' +
                '3）若持续异常，可更换网络后重试。\n\n' +
                '本回复为本地兜底，非模型生成。',
            },
          },
        ],
        _fallback: true,
        _detail: detail,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // KV 记录（不阻塞）
  if (env.CHAT_LOGS && lastData.choices[0]?.message?.content) {
    try {
      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUser = userMessages[userMessages.length - 1];
      // 提取最后用户文本（兼容多模态）
      let lastUserText = '';
      if (Array.isArray(lastUser?.content)) {
        lastUserText = lastUser.content
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('\n');
        const hasImg = lastUser.content.some((p) => p.type === 'image_url');
        if (hasImg) lastUserText = (lastUserText ? lastUserText + '\n' : '') + '[含图片]';
      } else {
        lastUserText = lastUser?.content || '';
      }

      const today = new Date().toISOString().slice(0, 10);
      const recordId = `chat_${today}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await env.CHAT_LOGS.put(
        recordId,
        JSON.stringify({
          id: recordId,
          ip: clientIP,
          location: locationText,
          route: usedModel || route.primary,
          routeLabel: isVision ? '图文' : '文本',
          model: usedModel,
          isVision,
          timestamp: new Date().toISOString(),
          question: lastUserText.slice(0, 2000),
          answer: String(lastData.choices[0].message.content).slice(0, 8000),
        }),
        { expirationTtl: 90 * 24 * 60 * 60 }
      );
    } catch (e) {
      console.error('KV put failed', e);
    }
  }

  // 附带调试头（不泄露 key）
  return new Response(JSON.stringify(lastData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Model-Used': usedModel || route.primary,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    },
  });
}
