// 玄机子 · Cloudflare Pages Function
// 按「用户所选模型」直连路由：不再静默多供应商兜底。
// 浏览器在请求体里带 model 字段（前端下拉所选的模型 id），
// 服务端据此映射到对应上游（Groq / b.ai / 智谱），密钥与上游真实模型代号不下发到浏览器。
// 任一线路失败时，返回带 model_error 标记的 SSE 帧，由前端提示用户重新选择模型。

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

// 前端未携带 model 字段时使用的默认线路 id（对应通义千问 3.6，走 Groq，速度快）。
const DEFAULT_MODEL_ID = 'qwen3.6';

function cleanBase(base) {
  return String(base || '').trim().replace(/\/+$/, '');
}

function envText(v) {
  return String(v || '').trim();
}

function hasImageContent(messages) {
  return (messages || []).some((m) => Array.isArray(m.content) && m.content.some((p) => p?.type === 'image_url' && p?.image_url?.url));
}

// 整理会话消息：保留 system 与最近 18 条，控制文本总量；
// allowImages 为 false 时剔除图片块（所选模型不支持读图时，退化为纯文本推演）。
function sanitizeMessages(input, allowImages = true) {
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
      } else if (allowImages && p?.type === 'image_url' && imageCount < 3) {
        const url = String(p?.image_url?.url || '');
        // Base64 data URLs 是正常路径；单张编码图限制在约 4.5 MB 以内。
        if (url && url.length <= 4_500_000) {
          imageCount += 1;
          parts.push({ type: 'image_url', image_url: { url } });
        }
      }
    }
    return { role, content: parts.length ? parts : '' };
  });
}

// 构造一个 OpenAI 兼容线路描述。extra 可带：
//   vision 是否支持读图；timeoutMs 单次超时；maxTokens 该线路建议的最大生成 token；
//   extraBody 附加到请求体的参数；omitSampling 是否省略 temperature。
function openaiCompat(id, label, base, key, model, extra = {}) {
  if (!key || !base || !model) return null;
  return {
    id, label, base, key, model,
    vision: !!extra.vision,
    timeoutMs: extra.timeoutMs || 16000,
    maxTokens: extra.maxTokens || 0,
    extraBody: extra.extraBody || null,
    omitSampling: !!extra.omitSampling,
    headers: extra.headers || null,
  };
}

// 模型 id → 上游线路 的路由表。id 与前端 MODEL_CATALOG 保持一致。
// b.ai 免费档上游有限流，故超时放宽、token 上限抬高，给推理模型留足空间。
function routeMap(env) {
  const baiKey = envText(env.B_AI_API_KEY);
  const groqKey = envText(env.GROQ_API_KEY);
  const zhipuKey = envText(env.ZHIPU_API_KEY);

  // b.ai 聚合网关：一个 Key 覆盖 DeepSeek / 千问 / 智谱 / 混元 / 小米 等免费模型。
  const bai = (model, vision, maxTokens) => openaiCompat(
    'bai', '玄机阁', 'https://api.b.ai/v1', baiKey, model,
    { vision, timeoutMs: 26000, maxTokens: maxTokens || 4096 }
  );

  return {
    // 默认首选：通义千问 3.6（Groq），速度快、支持图文。
    'qwen3.6': openaiCompat('groq', '灵台', 'https://api.groq.com/openai/v1', groqKey,
      envText(env.GROQ_MODEL) || 'qwen/qwen3.6-27b',
      { vision: true, timeoutMs: 13000, maxTokens: 2400, extraBody: { reasoning_effort: 'none' } }),

    // b.ai 免费模型。推理类（reasoning）会先输出 reasoning_content（服务端已过滤），
    // 故生成上限抬高到 6000，避免思考耗尽 token 导致正文为空。千问 3.8 亦属推理类。
    'qwen3.8-flash': bai('qwen3.8-flash', false, 6000),
    'deepseek-v4-flash': bai('deepseek-v4-flash', false, 6000),
    'deepseek-v4-flash-vision-exp': bai('deepseek-v4-flash-vision-exp', true, 6000),
    'glm-5.3-flash': bai('glm-5.3-flash', false, 6000),
    'hy3': bai('hy3', false, 6000),
    'mimo-v2.5': bai('mimo-v2.5', false, 6000),

    // 智谱 GLM 直连（保留既有 Key，可作为中文稳妥之选）。
    'glm-4.7-flash': openaiCompat('zhipu', '灵台', 'https://open.bigmodel.cn/api/paas/v4', zhipuKey,
      envText(env.ZHIPU_MODEL) || 'glm-4.7-flash',
      { timeoutMs: 16000, maxTokens: 2400, extraBody: { thinking: { type: 'disabled' } } }),
  };
}

function repairGarbledText(text) {
  let s = String(text || '');
  if (!s) return '';
  s = s.replace(/﻿/g, '');
  s = s.replace(/<(think|thought|reasoning|search)>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(think|thought|reasoning)[\s\S]*$/i, '');
  const mojibakeHits = (s.match(/[ÃÂâåæ]/g) || []).length;
  const cjkHits = (s.match(/[一-鿿]/g) || []).length;
  if (mojibakeHits >= 2 && cjkHits < 8) {
    try {
      const bytes = Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const decodedCjk = (decoded.match(/[一-鿿]/g) || []).length;
      if (decodedCjk > cjkHits) s = decoded;
    } catch { /* 保持原文 */ }
  }
  s = s.replace(/�+/g, '');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

function isRetryableFail(status, err) {
  // 402（额度用尽）重试无意义，不纳入重试集合。
  if (status === 429 || status === 408 || status === 503 || status === 529) return true;
  // controller.abort('timeout') 抛出的是 AbortError，须按 name 识别，否则超时不会被重试。
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return /quota|capacity|rate limit|timeout|overloaded|no more|upstream/.test(msg);
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
    modelId: record.modelId || '',
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

// 针对所选线路发起请求；对可重试错误（限流/超时）在同一线路内最多再试一次。
// 不跨模型兜底——失败交由前端提示用户重选。
async function callSelectedRoute(p, messages, maxTokens, temperature) {
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // 重试前短暂退避，给上游限流留喘息空间。
    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 400));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), p.timeoutMs || 20000);
    try {
      const resp = await callOpenAIProvider(p, messages, maxTokens, temperature, controller.signal);
      clearTimeout(timer);
      if (resp.ok && resp.body) return { response: resp };
      const status = resp.status;
      try { await resp.body?.cancel(); } catch {}
      lastErr = { status };
      if (!isRetryableFail(status)) break;
    } catch (err) {
      clearTimeout(timer);
      lastErr = { err };
      if (!isRetryableFail(0, err)) break;
    }
  }
  return { response: null, fail: lastErr };
}

// 生成一个「模型线路出错」的 SSE 帧，前端凭 model_error 标记提示重选模型。
function modelErrorSse(message, modelId) {
  const frame = { model_error: true, reselect: true, model: modelId, message };
  const sse = `data: ${JSON.stringify(frame)}\n\ndata: [DONE]\n\n`;
  return new Response(sse, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

function friendlyFailMessage(fail) {
  const status = fail?.status;
  if (status === 429 || status === 529) return '此模型当前问卜者众，灵台稍显拥挤。可稍候重试，或另择一尊法器（模型）再问。';
  if (status === 402) return '此模型的免费香火已用尽，请另择一尊法器（模型）再问。';
  if (status === 401 || status === 403) return '此模型的灵台尚未点亮（密钥未配置或已失效），请另择一尊法器（模型）。';
  if (status === 404) return '此模型暂不可用，请另择一尊法器（模型）。';
  return '此模型推演受阻（限流、超时或线路波动）。可稍候重试，或另择一尊法器（模型）再问。';
}

// ── 多用户公平性：按 IP 限流 ──────────────────────────────────────────────
// 上游为免费档密钥（Groq / b.ai / 智谱），配额全体用户共享。个别高频或脚本用户
// 可在短时间内打满配额，令其他在线问卜者尽数受阻。此处对单个 IP 做分钟级软限流，
// 保护共享香火。KV 读写异常时放行（fail-open），避免限流组件故障把所有人拒之门外。
// 采用非原子「读后自增」：高并发下可能轻微少计，作为软限流可接受。
const RATE_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const RATE_MAX = 30;              // 每 IP 每分钟最多问卜次数

async function checkRateLimit(env, request) {
  if (!env.CHAT_LOGS) return { allowed: true };
  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  const windowStart = Math.floor(Date.now() / RATE_WINDOW_MS);
  const key = `rl_${windowStart}_${ip}`;
  try {
    const cur = Number(await env.CHAT_LOGS.get(key)) || 0;
    if (cur >= RATE_MAX) return { allowed: false };
    // TTL 略大于窗口，窗口滚过后自动清理，不与 chat_ 日志混淆。
    await env.CHAT_LOGS.put(key, String(cur + 1), { expirationTtl: 120 });
    return { allowed: true };
  } catch {
    return { allowed: true }; // KV 异常放行
  }
}

// 以「普通助手消息帧」温和提示（区别于 model_error：不触发前端重选模型弹窗）。
function plainSseMessage(text) {
  const frame = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(frame, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
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

  // 多用户公平：同一 IP 分钟级问卜次数过多时温和劝阻，保护共享免费配额。
  const rateCheck = await checkRateLimit(env, request);
  if (!rateCheck.allowed) {
    return plainSseMessage('此刻问卜者众，灵台稍显拥挤。为护共享香火，请息心片刻，稍候再呈即可。');
  }

  // 解析用户所选模型 id，未携带则用默认线路。
  const modelId = String(body?.model || '').trim() || DEFAULT_MODEL_ID;
  const routes = routeMap(env);
  // 已知模型 id（无论密钥是否已配置）都走自身线路，绝不静默换成默认线路；
  // 仅未知 id 才回落默认。用 Object.hasOwn 区分「未配置(null)」与「未知」，
  // 同时屏蔽原型链键（__proto__/constructor 等）导致的意外命中。
  const route = Object.hasOwn(routes, modelId) ? routes[modelId] : routes[DEFAULT_MODEL_ID];

  if (!route) {
    return modelErrorSse('所选模型的灵台尚未点亮，请另择一尊法器（模型）。', modelId);
  }

  const requestHasImage = hasImageContent(body?.messages);
  // 所选模型不支持读图时，剔除图片块退化为纯文本，避免上游直接拒收。
  const messages = sanitizeMessages(body?.messages, route.vision);
  // 清洗后必须仍有非空的正文，否则直接拒绝，避免把空请求打给上游。
  const hasText = messages.some((m) => {
    if (m.role === 'system') return false;
    if (typeof m.content === 'string') return m.content.trim().length > 0;
    return Array.isArray(m.content) && m.content.some((p) => p?.type === 'text' && String(p.text || '').trim());
  });
  if (!messages.length || !hasText) return responseJson({ error: '缺少问卜内容' }, 400);

  const maxTokens = route.maxTokens || (Number.isFinite(body.max_tokens) ? Math.min(Math.max(body.max_tokens, 384), 4096) : 2400);
  const temperature = Number.isFinite(body.temperature) ? Math.min(Math.max(body.temperature, 0.1), 1) : 0.72;

  const { response: activeResponse, fail } = await callSelectedRoute(route, messages, maxTokens, temperature);

  if (!activeResponse) {
    const message = friendlyFailMessage(fail);
    const logPromise = saveRecord(env, request, {
      question: lastUserQuestion(messages), answer: message, route: 'error', routeLabel: route.label,
      model: route.model, modelId, vision: requestHasImage,
    }).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(logPromise);
    return modelErrorSse(message, modelId);
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

            // 过滤内部推理标签（即便被拆到多个 SSE 分片里也要剥净）。
            let output = '';
            while (delta) {
              if (insideThink) {
                const end = delta.search(/<\/(?:think|thought|reasoning|search)>/i);
                if (end === -1) { delta = ''; break; }
                delta = delta.slice(end).replace(/^<\/(?:think|thought|reasoning|search)>/i, '');
                insideThink = false;
              } else {
                const start = delta.search(/<(?:think|thought|reasoning|search)>/i);
                if (start === -1) { output += delta; delta = ''; break; }
                output += delta.slice(0, start);
                delta = delta.slice(start).replace(/^<(?:think|thought|reasoning|search)>/i, '');
                insideThink = true;
              }
            }
            await emitDelta(output);
          } catch {
            // 忽略上游异常帧，不把原始数据透传给浏览器。
          }
        }
      }

      // 推理模型可能把 token 都用在 reasoning 上，导致正文为空——此时提示重选或重试。
      if (!answer.trim()) {
        const empty = '此番推演只得气机流转，未成明文（多为该模型思考占用过多所致）。可稍候重试，或另择一尊法器（模型）再问。';
        await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: empty } }] })}\n\n`));
        answer = empty;
      }

      if (!doneSent) await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch {
      if (!doneSent) {
        try { await writer.write(encoder.encode('data: [DONE]\n\n')); } catch {}
      }
    } finally {
      try { await writer.close(); } catch {}
      const logPromise = saveRecord(env, request, {
        question, answer, route: route.id, routeLabel: route.label,
        model: route.model, modelId, vision: requestHasImage,
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
