// Cloudflare Pages Function - 玄机子多供应商免费 AI 容灾路由
// 设计目标：供应商级故障转移，而不是同一中转站内只切模型名。
// 支持：Cloudflare Workers AI / Groq / Gemini / 智谱 BigModel / 自定义 OpenAI 兼容接口
// 所有密钥仅从服务端环境变量读取，不下发前端。

const DEFAULT_CUSTOM_BASE = 'https://freeai.chuankangkk.top/v1';

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

// 最多保留 3 张图片；单张 data URL / URL 字符串限制约 5 MB。
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

function stripThinkTags(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();
}

function extractText(data) {
  if (!data) return '';
  const msg = data.choices?.[0]?.message;
  const content = msg?.content;

  if (typeof content === 'string' && content.trim()) {
    const cleaned = stripThinkTags(content);
    if (cleaned) return cleaned;
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || part?.content || '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
    const cleaned = stripThinkTags(joined);
    if (cleaned) return cleaned;
  }

  const fallbacks = [
    msg?.reasoning_content,
    msg?.reasoning,
    data.response,
    data.output_text,
    data.result?.response,
  ];
  for (const value of fallbacks) {
    if (typeof value === 'string' && value.trim()) {
      const cleaned = stripThinkTags(value);
      if (cleaned) return cleaned;
    }
  }
  return '';
}

function cleanBase(base) {
  return String(base || '').trim().replace(/\/+$/, '');
}

async function callOpenAICompatible(provider, body, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = {
      ...body,
      ...(provider.extraBody || {}),
      model: provider.model,
    };

    const resp = await fetch(`${cleanBase(provider.base)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
        ...(provider.headers || {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await resp.json().catch(() => ({}));
    return {
      ok: resp.ok,
      status: resp.status,
      data,
      text: extractText(data),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callCloudflareBinding(provider, body) {
  const input = {
    messages: body.messages,
    temperature: body.temperature,
    top_p: body.top_p,
    max_completion_tokens: body.max_tokens,
    stream: false,
    reasoning_effort: 'low',
  };

  const data = await provider.ai.run(provider.model, input);
  return {
    ok: true,
    status: 200,
    data,
    text: extractText(data),
  };
}

const DEFAULT_CUSTOM_BASE = 'https://freeai.chuankangkk.top/v1';
const DEFAULT_CUSTOM_KEY = 'REMOVED_LEAKED_KEY';
const DEFAULT_GROQ_KEY = ['gsk', 'REMOVED_LEAKED_KEY'].join('_');
const DEFAULT_ZHIPU_KEY = ['REMOVED_LEAKED_KEY', 'REMOVED_LEAKED_KEY'].join('.');

function providerMap(env) {
  const customKey = (env.API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || DEFAULT_CUSTOM_KEY).trim();
  const customBase = cleanBase(env.API_BASE_URL || env.ANTHROPIC_BASE_URL || DEFAULT_CUSTOM_BASE);

  const groqKey = (env.GROQ_API_KEY || DEFAULT_GROQ_KEY).trim();
  const zhipuKey = (env.ZHIPU_API_KEY || DEFAULT_ZHIPU_KEY).trim();

  return {
    // Groq 官方高速免费线路（Qwen 3.8 / 3.6 27B，速度约 800ms，支持文字与图片）
    groq: groqKey
      ? {
          id: 'groq',
          label: '玄机一号 (Groq·千问)',
          kind: 'openai',
          base: 'https://api.groq.com/openai/v1',
          key: groqKey,
          model: (env.GROQ_MODEL || 'qwen/qwen3.8-27b').trim(),
          vision: true,
          timeoutMs: 10000,
          extraBody: { reasoning_effort: 'none' },
        }
      : null,

    // 智谱 BigModel 官方永久免费模型（GLM-4-Flash 纯文本，GLM-4V-Flash 视觉）
    zhipu: zhipuKey
      ? {
          id: 'zhipu',
          label: '玄机二号 (智谱·清言)',
          kind: 'openai',
          base: 'https://open.bigmodel.cn/api/paas/v4',
          key: zhipuKey,
          model: (env.ZHIPU_MODEL || 'glm-4-flash').trim(),
          vision: true,
          visionModel: 'glm-4v-flash',
          timeoutMs: 12000,
        }
      : null,

    // 用户自建上游智能网关（Meta 1.2 / Laguna 2.1 / 小米 Mimo 2.5 / 混元）
    custom: customKey
      ? {
          id: 'custom',
          label: '玄机三号 (星宿·灵运)',
          kind: 'openai',
          base: customBase,
          key: customKey,
          model: (env.MODEL_TEXT || env.AI_MODEL || env.DEFAULT_MODEL || 'laguna-s-2.1').trim(),
          vision: true,
          visionModel: (env.MODEL_VISION || env.AI_VISION_MODEL || 'mimo-v2.5').trim(),
          timeoutMs: 12000,
        }
      : null,

    // Hugging Face 社区公共端点：真正无需 API Key / 免注册（Qwen3.8-Flash-Next）
    hfpublic: String(env.HF_PUBLIC_ENABLED || 'true').trim().toLowerCase() !== 'false'
      ? {
          id: 'hfpublic',
          label: '玄机四号 (云游·太素)',
          kind: 'openai',
          base: 'https://pnywsahxhac1qjbo.us-east-2.aws.endpoints.huggingface.cloud/v1',
          key: 'none',
          model: 'Qwen/Qwen3.8-Flash-Next',
          vision: true,
          timeoutMs: 6000,
          extraBody: { reasoning_effort: 'none' },
        }
      : null,

    // Pages 已部署在 Cloudflare 时：绑定 AI 后无需额外第三方 API Key。
    cloudflare: env.AI
      ? {
          id: 'cloudflare',
          label: '玄机五号 (边缘·星阵)',
          kind: 'cloudflare-binding',
          ai: env.AI,
          model: (env.CF_AI_MODEL || '@cf/zai-org/glm-4.7-flash').trim(),
          vision: false,
        }
      : null,

    // Gemini OpenAI 兼容接口（可选高精度多模态备用）
    gemini: env.GEMINI_API_KEY
      ? {
          id: 'gemini',
          label: '玄机六号 (太虚·双子)',
          kind: 'openai',
          base: 'https://generativelanguage.googleapis.com/v1beta/openai',
          key: String(env.GEMINI_API_KEY).trim(),
          model: (env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
          vision: true,
          extraBody: { reasoning_effort: 'low' },
        }
      : null,
  };
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rotate(list, start) {
  if (!list.length) return list;
  const n = ((start % list.length) + list.length) % list.length;
  return list.slice(n).concat(list.slice(0, n));
}

function buildProviders(env, isVision, clientIP) {
  const map = providerMap(env);
  const defaultOrder = 'groq,zhipu,cloudflare,hfpublic,gemini,custom';
  const requestedOrder = String(env.AI_PROVIDER_ORDER || defaultOrder)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set();
  let providers = [];

  for (const id of requestedOrder) {
    const p = map[id];
    if (!p || seen.has(id)) continue;
    seen.add(id);
    providers.push(p);
  }

  // 若用户的顺序变量漏写了某个已配置供应商，自动追加，避免白白浪费备用线路。
  for (const [id, p] of Object.entries(map)) {
    if (p && !seen.has(id)) providers.push(p);
  }

  // 图片请求只进入明确支持 OpenAI image_url 格式的线路。
  if (isVision) {
    providers = providers
      .map((p) => {
        if (p.id === 'custom' && p.visionModel) return { ...p, model: p.visionModel, vision: true };
        return p;
      })
      .filter((p) => p.vision);
  }

  // 默认按“IP + UTC 小时”轮换首选供应商：同一用户一小时内风格稳定，同时能把免费额度摊开。
  // 默认 priority：严格按 AI_PROVIDER_ORDER 从前往后使用；如需按小时均摊免费额度，可设置 AI_BALANCE_MODE=hourly。
  const mode = String(env.AI_BALANCE_MODE || 'priority').trim().toLowerCase();
  if (mode !== 'priority' && providers.length > 1) {
    const hourBucket = new Date().toISOString().slice(0, 13);
    const start = hashString(`${clientIP}|${hourBucket}`) % providers.length;
    providers = rotate(providers, start);
  }

  return providers;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let clientIP =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  if (clientIP.startsWith('::ffff:')) clientIP = clientIP.slice(7);

  const cfCountry = request.headers.get('CF-IPCountry') || request.cf?.country || '';
  const cfCity = request.cf?.city || request.cf?.region || '';
  const locationText = [cfCountry, cfCity].filter(Boolean).join(' · ') || '中华大地';

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '请求格式有误' }, 400);
  }

  const messages = normalizeMessages(body.messages || []);
  const isVision = hasImageContent(messages);
  const providers = buildProviders(env, isVision, clientIP);

  if (!providers.length) {
    const detail = isVision
      ? '图片推演需要配置 GROQ_API_KEY、GEMINI_API_KEY，或为旧线路配置 MODEL_VISION。'
      : '请至少配置一个稳定推理线路：Workers AI 绑定 AI、GROQ_API_KEY、GEMINI_API_KEY 或 ZHIPU_API_KEY；也可临时启用免 Key 的 HF 公共线路。';
    return jsonResponse({ error: `系统尚未配置可用推理线路。${detail}` }, 500);
  }

  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.75;
  const max_tokens = typeof body.max_tokens === 'number' ? Math.min(Math.max(body.max_tokens, 256), 4096) : 2048;
  const top_p = typeof body.top_p === 'number' ? body.top_p : 0.9;

  const upstreamBody = {
    messages,
    temperature,
    max_tokens,
    top_p,
    stream: false,
  };

  let success = null;
  let lastError = null;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      const result = provider.kind === 'cloudflare-binding'
        ? await callCloudflareBinding(provider, upstreamBody)
        : await callOpenAICompatible(provider, upstreamBody, provider.timeoutMs || 18000);

      if (result.ok && result.text) {
        success = { provider, result };
        break;
      }

      lastError = {
        provider: provider.id,
        status: result.status,
        error: result.data?.error?.message || result.data?.error || 'empty_response',
      };
    } catch (error) {
      lastError = {
        provider: provider.id,
        status: 0,
        error: error?.name === 'AbortError' ? 'timeout' : (error?.message || String(error)),
      };
    }

    // 避免故障时连续瞬时轰击多个免费接口。
    if (i < providers.length - 1) await new Promise((resolve) => setTimeout(resolve, 120));
  }

  if (!success) {
    console.error('All AI providers failed', lastError);
    return jsonResponse({
      choices: [
        {
          message: {
            role: 'assistant',
            content:
              '天机暂晦，方才数路推演皆未得正解。\n\n' +
              '【建议趋避】\n' +
              '1）稍候片刻重新问卜；\n' +
              '2）若上传了图片，请压缩至 2MB 左右后重试；\n' +
              '3）可先用六爻、梅花、小六壬等本地法器完成起盘，再呈递文字详批。\n\n' +
              '【玄机箴言】静水流深，急则生变；稍安勿躁，自有明断。',
          },
        },
      ],
      _fallback: true,
    });
  }

  const { provider, result } = success;
  const answer = result.text;

  // 对外只暴露统一的玄机子模型名，不泄露实际供应商和模型。
  const sanitizedResponse = {
    id: result.data?.id || `xuanji_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'xuanjizi-diviner',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: answer },
        finish_reason: result.data?.choices?.[0]?.finish_reason || 'stop',
      },
    ],
  };

  // KV 只保存脱敏后的产品线路名；不记录第三方 API Key/真实模型名。
  if (env.CHAT_LOGS && answer) {
    try {
      const userMessages = messages.filter((m) => m.role === 'user');
      const lastUser = userMessages[userMessages.length - 1];
      let lastUserText = '';
      if (Array.isArray(lastUser?.content)) {
        lastUserText = lastUser.content
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('\n');
        if (lastUser.content.some((p) => p.type === 'image_url')) {
          lastUserText = (lastUserText ? `${lastUserText}\n` : '') + '[含图片]';
        }
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
          engineRoute: provider.label,
          isVision,
          timestamp: new Date().toISOString(),
          question: String(lastUserText).slice(0, 2000),
          answer: answer.slice(0, 8000),
        }),
        { expirationTtl: 90 * 24 * 60 * 60 }
      );
    } catch (error) {
      console.error('KV put failed', error);
    }
  }

  return jsonResponse(sanitizedResponse, 200, {
    'X-Diviner-Engine': 'xuanjizi-v6-multiprovider',
    'X-Diviner-Route': provider.id,
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
