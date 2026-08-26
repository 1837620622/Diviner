// Cloudflare Pages Function - 单线路 + 自动路由 + 多重智能兜底
// 密钥通过环境变量注入，不落地仓库
// 支持：纯文本优先走 nemotron/deepseek，图片优先走 mimo/gpt-4o-mini，全自动兜底
// 环境变量：
//   API_BASE_URL     默认 https://freeai.chuankangkk.top/v1
//   API_KEY          必填（OpenAI兼容密钥）
//   MODEL_TEXT       可选，自定义文本模型
//   MODEL_VISION     可选，自定义视觉模型
//   FALLBACK_ENABLED 默认 true

const DEFAULT_BASE = 'https://freeai.chuankangkk.top/v1';

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

async function callUpstream({ base, key, model, body, timeoutMs = 45000 }) {
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

export async function onRequestPost(context) {
  const { request, env } = context;

  const API_BASE = (env.API_BASE_URL || env.ANTHROPIC_BASE_URL || DEFAULT_BASE).trim();
  const API_KEY = (env.API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || '').trim();

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: '系统核心鉴权未配置，请在 Cloudflare Pages 环境变量中设置 API_KEY（不存入公开代码仓库）' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // 获取 IP 与地理（仅用于命理人设的“掐指一算”，不泄露技术细节）
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
    return new Response(JSON.stringify({ error: '请求格式有误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const rawMessages = body.messages || [];
  const messages = normalizeMessages(rawMessages);
  const isVision = hasImageContent(messages);

  // 动态模型路由配置（支持通过环境变量完全自定义）
  const configuredText = (env.MODEL_TEXT || env.AI_MODEL || env.DEFAULT_MODEL || 'nemotron-3-ultra-free').trim();
  const configuredVision = (env.MODEL_VISION || env.AI_VISION_MODEL || 'mimo-v2.5-free').trim();

  const textCandidates = Array.from(new Set([
    configuredText,
    'nemotron-3-ultra-free',
    'mimo-v2.5-free',
    'laguna-s-2.1-free',
    'deepseek-chat',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
  ])).filter(Boolean);

  const visionCandidates = Array.from(new Set([
    configuredVision,
    'mimo-v2.5-free',
    'gpt-4o-mini',
    'nemotron-3-ultra-free',
    'laguna-s-2.1-free',
  ])).filter(Boolean);

  const candidates = isVision ? visionCandidates : textCandidates;

  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.75;
  const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 2048;
  const top_p = typeof body.top_p === 'number' ? body.top_p : 0.9;

  const upstreamBaseBody = {
    messages,
    temperature,
    max_tokens,
    top_p,
    stream: false,
  };

  let lastError = null;
  let lastData = null;
  let usedModel = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const { resp, data } = await callUpstream({
        base: API_BASE,
        key: API_KEY,
        model,
        body: upstreamBaseBody,
        timeoutMs: 12000,
      });

      if (resp.ok && data.choices && data.choices[0]?.message) {
        usedModel = model;
        lastData = data;
        break;
      }

      const isRetryable = resp.status === 429 || resp.status >= 500 || resp.status === 400;
      lastError = { status: resp.status, data };
      lastData = data;

      if (resp.status === 400 && String(JSON.stringify(data)).toLowerCase().includes('image')) {
        if (i < candidates.length - 1) continue;
      }

      if (!isRetryable) break;
      if (i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, 350 * (i + 1)));
        continue;
      }
    } catch (e) {
      lastError = { status: 0, message: e.message || String(e) };
      if (i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, 350 * (i + 1)));
        continue;
      }
    }
  }

  // 若全部失败，返回温润典雅的命理兜底回复（绝不暴露上游真实错误信息或模型名）
  if (!lastData || !lastData.choices || !lastData.choices[0]?.message) {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                '天机暂晦，方才一试未得正解。\n\n' +
                '可能原因：推演气场暂未凝聚，或上传之图元数据过大。\n\n' +
                '【建议趋避】\n' +
                '1）若上传了图片，请将图片压缩至 2MB 以内，或以文字描述面相手纹、居室朝向；\n' +
                '2）稍候片刻重新问卜；\n' +
                '3）可在下方点击【法器】直接使用六爻、摇签、梅花或排盘法器起卦。\n\n' +
                '箴言：「静水流深，急则生变；稍安勿躁，自有明断。」\n\n' +
                '本回复为系统温和兜底，事在人为，行则将至。',
            },
          },
        ],
        _fallback: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // 严格脱敏：清理上游模型字段，杜绝泄露
  const sanitizedResponse = {
    id: lastData.id || `xuanji_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'xuanjizi-diviner', // 统一隐藏上游模型名
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: lastData.choices[0].message.content || '',
        },
        finish_reason: lastData.choices[0].finish_reason || 'stop',
      },
    ],
  };

  // KV 记录（仅服务端保存用于审计统计，不对外输出）
  if (env.CHAT_LOGS && lastData.choices[0]?.message?.content) {
    try {
      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUser = userMessages[userMessages.length - 1];
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
          route: isVision ? 'vision' : 'text',
          routeLabel: isVision ? '图文观形' : '文本演算',
          model: 'xuanjizi-core',
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

  return new Response(JSON.stringify(sanitizedResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Diviner-Engine': 'xuanjizi-v3',
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


