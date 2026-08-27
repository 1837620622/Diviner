// 玄机子 · Cloudflare Pages Function
// 服务端隐式路由：Groq → 智谱 GLM-4.7-flash → Cloudflare Workers AI
// Groq 置首：快、上下文窗口大（qwen3.6-27b 128K），长对话不截断；
// 智谱兜底、Workers AI 殿后兜底。密钥与模型代号不返回给浏览器。

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
  let tail = raw.filter((m) => m?.role !== 'system').slice(-18);

  // 上游模型有上下文上限：会话过长时从最旧消息裁减，
  // 把文本总量控制在预算内，避免请求体超限被上游直接拒收。
  const TEXT_BUDGET = 100000;
  let used = 0;
  const kept = [];
  for (let i = tail.length - 1; i >= 0; i--) {
    const m = tail[i];
    const len = Array.isArray(m?.content)
      ? m.content.reduce((n, p) => n + String(p?.type === 'text' ? p?.text || '' : '').length, 0)
      : String(m?.content || '').length;
    if (used + len > TEXT_BUDGET && kept.length) break;
    used += len;
    kept.unshift(m);
  }
  tail = kept;

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

function splitList(raw, fallback) {
  return envText(raw || fallback).split(',').map((v) => v.trim()).filter(Boolean);
}

function openaiCompat(id, label, base, key, model, extra = {}) {
  if (!key || !base || !model) return null;
  return {
    id, label, base, key, model,
    vision: !!extra.vision,
    timeoutMs: extra.timeoutMs || 16000,
    extraBody: extra.extraBody || null,
    omitSampling: !!extra.omitSampling,
    headers: extra.headers || null,
  };
}

function providerMap(env) {
  const zhipuKey = envText(env.ZHIPU_API_KEY);
  const groqKey = envText(env.GROQ_API_KEY);

  const cfTextModels = splitList(env.CF_AI_MODELS, [
    '@cf/qwen/qwen3.8-27b',
    '@cf/zai-org/glm-5.3-flash',
    '@cf/zai-org/glm-4.7-flash',
  ].join(','));
  const cfVisionModels = splitList(env.CF_AI_VISION_MODELS, [
    '@cf/qwen/qwen3.8-27b',
    '@cf/zai-org/glm-5.3-flash',
    '@cf/meta/llama-3.2-11b-vision-instruct',
  ].join(','));

  return {
    cloudflare: env.AI ? {
      id: 'cloudflare', label: '灵台', kind: 'cloudflare-binding',
      ai: env.AI, models: cfTextModels, visionModels: cfVisionModels,
      vision: true, timeoutMs: 14000,
    } : null,
    groq: openaiCompat('groq', '灵台', 'https://api.groq.com/openai/v1', groqKey,
      envText(env.GROQ_MODEL) || 'qwen/qwen3.6-27b',
      { vision: true, timeoutMs: 13000, extraBody: { reasoning_effort: 'none' } }),
    zhipu: openaiCompat('zhipu', '灵台', 'https://open.bigmodel.cn/api/paas/v4', zhipuKey,
      envText(env.ZHIPU_MODEL) || 'glm-4.7-flash',
      { timeoutMs: 16000, extraBody: { thinking: { type: 'disabled' } } }),
  };
}

function buildProviders(env, isVision) {
  const map = providerMap(env);
  // Groq 置首（快且上下文窗口大，长对话不截断）→ 智谱 GLM → Workers AI 殿后
  const order = isVision ? ['groq', 'cloudflare'] : ['groq', 'zhipu', 'cloudflare'];
  const out = [];
  for (const id of order) {
    const p = map[id];
    if (!p) continue;
    if (isVision && !p.vision) continue;
    out.push(p);
  }
  return out;
}

function repairGarbledText(text) {
  let s = String(text || '');
  if (!s) return '';
  s = s.replace(/\uFEFF/g, '');
  s = s.replace(/<(think|thought|reasoning|search)>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(think|thought|reasoning)[\s\S]*$/i, '');
  const mojibakeHits = (s.match(/[ÃÂâåæ]/g) || []).length;
  const cjkHits = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  if (mojibakeHits >= 2 && cjkHits < 8) {
    try {
      const bytes = Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
      if (decodedCjk > cjkHits) s = decoded;
    } catch { /* 保持原文 */ }
  }
  s = s.replace(/\uFFFD+/g, '');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

function isRetryableFail(status, err) {
  if (status === 429 || status === 402 || status === 408 || status === 503 || status === 529) return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return /quota|capacity|rate limit|timeout|aborterror|overloaded|no more/.test(msg);
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
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${p.key}`,
    ...(p.headers || {}),
  };
  return fetch(`${cleanBase(p.base)}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

async function callCloudflareModels(p, messages, maxTokens, isVision, timeoutMs) {
  const models = isVision ? (p.visionModels || p.models) : p.models;
  const attempts = [];
  for (const model of models || []) {
    try {
      const stream = await withTimeout(
        p.ai.run(model, { messages, stream: true, max_tokens: maxTokens }),
        timeoutMs
      );
      if (stream) {
        return { stream, model, attempts };
      }
      attempts.push('empty');
    } catch (err) {
      attempts.push(err?.name === 'AbortError' ? 'timeout' : 'error');
      if (!isRetryableFail(0, err)) continue;
    }
  }
  return { stream: null, model: '', attempts };
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
    return responseJson({ error: '灵台暂未点亮，请稍后再问。' }, 503);
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
      if (p.kind === 'cloudflare-binding') {
        const cf = await callCloudflareModels(p, messages, maxTokens, isVision, p.timeoutMs || 18000);
        clearTimeout(timer);
        attempts.push(...cf.attempts);
        if (cf.stream) {
          activeResponse = new Response(cf.stream, { status: 200 });
          activeProvider = { ...p, model: cf.model };
          break;
        }
        continue;
      }

      const resp = await callOpenAIProvider(p, messages, maxTokens, temperature, controller.signal);
      clearTimeout(timer);
      if (resp.ok && resp.body) {
        activeResponse = resp;
        activeProvider = p;
        break;
      }
      attempts.push(String(resp.status));
      try { await resp.body?.cancel(); } catch {}
      if (!isRetryableFail(resp.status)) continue;
    } catch (err) {
      clearTimeout(timer);
      attempts.push(err?.name === 'AbortError' ? 'timeout' : 'error');
    }
  }

  if (!activeResponse?.body || !activeProvider) {
    const fallback = '此刻推演稍滞，未能取得完整卦辞。若已多轮问卜、心力纷繁，可点「新起一卦」另开一局再问；若上传了图片，可先压缩后重试。';
    const logPromise = saveRecord(env, request, {
      question: lastUserQuestion(messages), answer: fallback, route: 'fallback', routeLabel: '灵台', model: '', vision: isVision,
    }).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(logPromise);
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sse, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
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
      const cleaned = repairGarbledText(delta);
      if (!cleaned) return;
      answer += cleaned;
      await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: cleaned } }] })}\n\n`));
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
        question, answer, route: 'oracle', routeLabel: '灵台',
        model: '', vision: isVision,
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
