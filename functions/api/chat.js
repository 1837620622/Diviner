// 玄机子 · Cloudflare Pages Function
// v8.1 多供应商容灾：智谱 / Groq / Workers AI / Gemini / HF 公共端点 / 自定义上游
// 所有密钥只从 Cloudflare Environment Variables / Secrets 读取，源码不包含真实密钥。

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function cleanBase(base) {
  return String(base || '').trim().replace(/\/+$/, '');
}

function envText(v) {
  return String(v || '').trim();
}

function hasImageContent(messages) {
  return (messages || []).some((m) => Array.isArray(m.content) && m.content.some((p) => p?.type === 'image_url' && p?.image_url?.url));
}

function sanitizeMessages(input) {
  const raw = Array.isArray(input) ? input : [];
  const firstSystem = raw.find((m) => m?.role === 'system');
  const tail = raw.filter((m) => m?.role !== 'system').slice(-18);
  const selected = firstSystem ? [firstSystem, ...tail] : tail;

  let imageCount = 0;
  return selected.map((m) => {
    const role = ['system', 'user', 'assistant'].includes(m?.role) ? m.role : 'user';
    if (!Array.isArray(m?.content)) {
      return { role, content: String(m?.content || '').slice(0, 24000) };
    }

    const parts = [];
    for (const p of m.content) {
      if (p?.type === 'text') {
        parts.push({ type: 'text', text: String(p.text || '').slice(0, 12000) });
      } else if (p?.type === 'image_url' && imageCount < 3) {
        const url = String(p?.image_url?.url || '');
        // Base64 data URLs are the normal path here; cap each encoded image to ~4.5 MB.
        if (url && url.length <= 4_500_000) {
          imageCount += 1;
          parts.push({ type: 'image_url', image_url: { url } });
        }
      }
    }
    return { role, content: parts.length ? parts : '' };
  });
}

function providerMap(env) {
  const zhipuKey = envText(env.ZHIPU_API_KEY);
  const groqKey = envText(env.GROQ_API_KEY);
  const geminiKey = envText(env.GEMINI_API_KEY);
  const customKey = envText(env.API_KEY || env.OPENAI_API_KEY);
  const customBase = cleanBase(env.API_BASE_URL || env.OPENAI_BASE_URL);

  return {
    zhipu: zhipuKey ? {
      id: 'zhipu', label: '灵枢一',
      base: 'https://open.bigmodel.cn/api/paas/v4', key: zhipuKey,
      model: envText(env.ZHIPU_MODEL) || 'glm-4.7-flash',
      vision: false, timeoutMs: 16000,
      extraBody: { thinking: { type: 'disabled' } }
    } : null,

    groq: groqKey ? {
      id: 'groq', label: '灵枢二',
      base: 'https://api.groq.com/openai/v1', key: groqKey,
      model: envText(env.GROQ_MODEL) || 'qwen/qwen3.6-27b',
      vision: true, timeoutMs: 13000,
      extraBody: { reasoning_effort: 'none' }
    } : null,

    cloudflare: env.AI ? {
      id: 'cloudflare', label: '灵枢三', kind: 'cloudflare-binding',
      ai: env.AI, model: envText(env.CF_AI_MODEL) || '@cf/zai-org/glm-4.7-flash',
      vision: false, timeoutMs: 15000
    } : null,

    gemini: geminiKey ? {
      id: 'gemini', label: '灵枢四',
      base: 'https://generativelanguage.googleapis.com/v1beta/openai', key: geminiKey,
      model: envText(env.GEMINI_MODEL) || 'gemini-3.7-flash',
      vision: true, timeoutMs: 17000,
      // Gemini 3.x OpenAI compatibility rejects legacy sampling parameters in some configurations.
      omitSampling: true,
      extraBody: { reasoning_effort: 'low' }
    } : null,

    hfpublic: envText(env.HF_PUBLIC_ENABLED || 'true').toLowerCase() !== 'false' ? {
      id: 'hfpublic', label: '浮云备用',
      base: cleanBase(env.HF_PUBLIC_BASE_URL) || 'https://pnywsahxhac1qjbo.us-east-2.aws.endpoints.huggingface.cloud/v1', key: envText(env.HF_PUBLIC_KEY) || 'none',
      model: envText(env.HF_PUBLIC_MODEL) || 'Qwen/Qwen3.8-Flash-Next', vision: true, timeoutMs: 10000,
      extraBody: { reasoning_effort: 'none' }
    } : null,

    custom: customKey && customBase ? {
      id: 'custom', label: '自备上游',
      base: customBase, key: customKey,
      model: envText(env.MODEL_TEXT || env.DEFAULT_MODEL) || 'gpt-4o-mini',
      vision: true,
      visionModel: envText(env.MODEL_VISION),
      timeoutMs: 16000
    } : null,
  };
}

function buildProviders(env, isVision) {
  const map = providerMap(env);
  const normalDefault = 'zhipu,groq,cloudflare,gemini,hfpublic,custom';
  const visionDefault = 'groq,gemini,hfpublic,custom';
  const configured = envText(isVision ? env.AI_VISION_PROVIDER_ORDER : env.AI_PROVIDER_ORDER);
  const order = (configured || (isVision ? visionDefault : normalDefault))
    .split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const id of order) {
    let p = map[id];
    if (!p || seen.has(id)) continue;
    if (isVision && !p.vision) continue;
    if (isVision && p.id === 'custom' && p.visionModel) p = { ...p, model: p.visionModel };
    seen.add(id);
    out.push(p);
  }
  return out;
}

function lastUserQuestion(messages) {
  const m = [...messages].reverse().find((x) => x.role === 'user');
  if (!m) return '';
  if (typeof m.content === 'string') return m.content.slice(0, 1200);
  const text = (m.content || []).find((p) => p?.type === 'text')?.text || '';
  return String(text).slice(0, 1200);
}

function requestLocation(request) {
  const cf = request.cf || {};
  const parts = [cf.city, cf.region, cf.country].filter(Boolean);
  return parts.join(' · ');
}

async function saveRecord(env, request, record) {
  if (!env.CHAT_LOGS) return;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const key = `chat_${day}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const payload = {
    timestamp: now.toISOString(),
    ip,
    location: requestLocation(request),
    question: record.question || '',
    answer: String(record.answer || '').slice(0, 18000),
    route: record.route || '',
    routeLabel: record.routeLabel || '',
    model: record.model || '',
    vision: !!record.vision,
  };
  await env.CHAT_LOGS.put(key, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 90 });
}

function responseJson(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}

async function withTimeout(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new DOMException('timeout', 'AbortError')), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callOpenAIProvider(p, messages, maxTokens, temperature, signal) {
  const body = {
    model: p.model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    ...(p.omitSampling ? {} : { temperature }),
    ...(p.extraBody || {}),
  };
  return fetch(`${cleanBase(p.base)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify(body),
    signal,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return responseJson({ error: '请求格式有误' }, 400);
  }

  const messages = sanitizeMessages(body?.messages);
  if (!messages.length) return responseJson({ error: '缺少问卜内容' }, 400);

  const isVision = hasImageContent(messages);
  const providers = buildProviders(env, isVision);
  if (!providers.length) {
    return responseJson({ error: isVision ? '当前未配置可处理图片的线路' : '系统尚未配置可用推演线路' }, 503);
  }

  const maxTokens = Number.isFinite(body.max_tokens) ? Math.min(Math.max(body.max_tokens, 384), 4096) : 2400;
  const temperature = Number.isFinite(body.temperature) ? Math.min(Math.max(body.temperature, 0.1), 1) : 0.72;

  let activeResponse = null;
  let activeProvider = null;
  const attempts = [];

  for (const p of providers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), p.timeoutMs || 15000);
    try {
      let resp;
      if (p.kind === 'cloudflare-binding') {
        const stream = await withTimeout(p.ai.run(p.model, { messages, stream: true, max_tokens: maxTokens }), p.timeoutMs || 15000);
        clearTimeout(timer);
        if (stream) {
          activeResponse = new Response(stream, { status: 200 });
          activeProvider = p;
          break;
        }
        attempts.push(`${p.id}:empty`);
        continue;
      }

      resp = await callOpenAIProvider(p, messages, maxTokens, temperature, controller.signal);
      clearTimeout(timer);
      if (resp.ok && resp.body) {
        activeResponse = resp;
        activeProvider = p;
        break;
      }
      attempts.push(`${p.id}:${resp.status}`);
      try { await resp.body?.cancel(); } catch {}
    } catch (err) {
      clearTimeout(timer);
      attempts.push(`${p.id}:${err?.name === 'AbortError' ? 'timeout' : 'error'}`);
    }
  }

  if (!activeResponse?.body || !activeProvider) {
    const fallback = '此刻推演线路繁忙，未能取得完整卦辞。请稍候片刻再问一次；若上传了图片，可先压缩后重试。';
    const logPromise = saveRecord(env, request, {
      question: lastUserQuestion(messages), answer: fallback, route: 'fallback', routeLabel: '线路失败', model: '', vision: isVision,
    }).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(logPromise);
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sse, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Diviner-Route': 'fallback',
        'X-Diviner-Attempts': attempts.join(',').slice(0, 220),
      },
    });
  }

  const reader = activeResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const question = lastUserQuestion(messages);

  const pump = (async () => {
    let lineBuffer = '';
    let answer = '';
    let insideThink = false;
    let doneSent = false;

    const emitDelta = async (delta) => {
      if (!delta) return;
      answer += delta;
      await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`));
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = lines.pop() || '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') {
            if (!doneSent) {
              await writer.write(encoder.encode('data: [DONE]\n\n'));
              doneSent = true;
            }
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            let delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.response ?? parsed?.result?.response ?? '';
            if (Array.isArray(delta)) delta = delta.map((x) => x?.text || '').join('');
            if (!delta) continue;

            // Remove internal reasoning tags even when they are split across SSE chunks.
            let output = '';
            while (delta) {
              if (insideThink) {
                const end = delta.search(/<\/(?:think|reasoning)>/i);
                if (end === -1) { delta = ''; break; }
                delta = delta.slice(end).replace(/^<\/(?:think|reasoning)>/i, '');
                insideThink = false;
              } else {
                const start = delta.search(/<(?:think|reasoning)>/i);
                if (start === -1) { output += delta; delta = ''; break; }
                output += delta.slice(0, start);
                delta = delta.slice(start).replace(/^<(?:think|reasoning)>/i, '');
                insideThink = true;
              }
            }
            await emitDelta(output);
          } catch {
            // Ignore malformed provider event; do not leak raw upstream frames to the browser.
          }
        }
      }

      if (!doneSent) await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch {
      if (!doneSent) {
        try { await writer.write(encoder.encode('data: [DONE]\n\n')); } catch {}
      }
    } finally {
      try { await writer.close(); } catch {}
      const logPromise = saveRecord(env, request, {
        question, answer, route: activeProvider.id, routeLabel: activeProvider.label,
        model: activeProvider.model, vision: isVision,
      }).catch(() => {});
      if (typeof context.waitUntil === 'function') context.waitUntil(logPromise);
      else await logPromise;
    }
  })();

  if (typeof context.waitUntil === 'function') context.waitUntil(pump);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'X-Diviner-Route': activeProvider.id,
      'X-Diviner-Engine': activeProvider.id,
      'Vary': 'Accept-Encoding',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
