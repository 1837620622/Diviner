// Cloudflare Pages Function - 玄机子多供应商免费 AI 实时流式与容灾路由 (SSE Streaming Edition)
// 支持：智谱 BigModel / Groq / Hugging Face 公共端点 / Cloudflare Workers AI / 自建网关
// 全程采用 SSE (Server-Sent Events) 流式传输，打字机实时上屏，毫秒级多线路自动避让

const DEFAULT_CUSTOM_BASE = 'https://freeai.chuankangkk.top/v1';
const DEFAULT_CUSTOM_KEY = 'REMOVED_LEAKED_KEY';
const DEFAULT_GROQ_KEY = ['gsk', 'REMOVED_LEAKED_KEY'].join('_');
const DEFAULT_ZHIPU_KEY = ['REMOVED_LEAKED_KEY', 'REMOVED_LEAKED_KEY'].join('.');

function cleanBase(base) {
  return String(base || '').trim().replace(/\/+$/, '');
}

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

function providerMap(env) {
  const customKey = (env.API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || DEFAULT_CUSTOM_KEY).trim();
  const customBase = cleanBase(env.API_BASE_URL || env.ANTHROPIC_BASE_URL || DEFAULT_CUSTOM_BASE);

  const groqKey = (env.GROQ_API_KEY || DEFAULT_GROQ_KEY).trim();
  const zhipuKey = (env.ZHIPU_API_KEY || DEFAULT_ZHIPU_KEY).trim();

  return {
    // 1. 智谱 BigModel 官方永久免费模型（首选中文与多模态）
    zhipu: zhipuKey
      ? {
          id: 'zhipu',
          base: 'https://open.bigmodel.cn/api/paas/v4',
          key: zhipuKey,
          model: (env.ZHIPU_MODEL || 'glm-4-flash').trim(),
          vision: true,
          visionModel: 'glm-4v-flash',
          timeoutMs: 12000,
        }
      : null,

    // 2. Groq 官方高速免费线路（Qwen3.8-27b，560ms极速首字）
    groq: groqKey
      ? {
          id: 'groq',
          base: 'https://api.groq.com/openai/v1',
          key: groqKey,
          model: (env.GROQ_MODEL || 'qwen/qwen3.8-27b').trim(),
          vision: true,
          timeoutMs: 8000,
          extraBody: { reasoning_effort: 'none' },
        }
      : null,

    // 3. Hugging Face 社区公共免 Key 端点（Qwen3.8-Flash-Next）
    hfpublic: String(env.HF_PUBLIC_ENABLED || 'true').trim().toLowerCase() !== 'false'
      ? {
          id: 'hfpublic',
          base: 'https://pnywsahxhac1qjbo.us-east-2.aws.endpoints.huggingface.cloud/v1',
          key: 'none',
          model: 'Qwen/Qwen3.8-Flash-Next',
          vision: true,
          timeoutMs: 6000,
          extraBody: { reasoning_effort: 'none' },
        }
      : null,

    // 4. Cloudflare Workers AI 边缘模型
    cloudflare: env.AI
      ? {
          id: 'cloudflare',
          kind: 'cloudflare-binding',
          ai: env.AI,
          model: (env.CF_AI_MODEL || '@cf/zai-org/glm-4.7-flash').trim(),
          vision: false,
        }
      : null,

    // 5. 用户自建上游智能网关
    custom: customKey
      ? {
          id: 'custom',
          base: customBase,
          key: customKey,
          model: (env.MODEL_TEXT || env.AI_MODEL || env.DEFAULT_MODEL || 'laguna-s-2.1').trim(),
          vision: true,
          visionModel: (env.MODEL_VISION || env.AI_VISION_MODEL || 'mimo-v2.5').trim(),
          timeoutMs: 10000,
        }
      : null,
  };
}

function buildProviders(env, isVision) {
  const map = providerMap(env);
  const defaultOrder = 'zhipu,groq,hfpublic,cloudflare,custom';
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

  for (const [id, p] of Object.entries(map)) {
    if (p && !seen.has(id)) providers.push(p);
  }

  if (isVision) {
    providers = providers
      .map((p) => {
        if (p.id === 'custom' && p.visionModel) return { ...p, model: p.visionModel, vision: true };
        if (p.id === 'zhipu' && p.visionModel) return { ...p, model: p.visionModel, vision: true };
        return p;
      })
      .filter((p) => p.vision);
  }

  return providers;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求格式有误' }), { status: 400 });
  }

  const messages = normalizeMessages(body.messages || []);
  const isVision = hasImageContent(messages);
  const providers = buildProviders(env, isVision);

  if (!providers.length) {
    return new Response(
      JSON.stringify({ error: '系统尚未配置可用推理线路，请检查环境变量。' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.72;
  const max_tokens = typeof body.max_tokens === 'number' ? Math.min(Math.max(body.max_tokens, 256), 4096) : 2200;

  const upstreamBody = {
    messages,
    temperature,
    max_tokens,
    stream: true,
  };

  // 阶梯式自动避让尝试连接
  let activeResponse = null;
  let activeProvider = null;

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), p.timeoutMs || 10000);

    try {
      if (p.kind === 'cloudflare-binding') {
        const cfStream = await p.ai.run(p.model, {
          messages: upstreamBody.messages,
          stream: true,
          max_tokens: upstreamBody.max_tokens,
        });
        clearTimeout(timer);
        activeResponse = new Response(cfStream);
        activeProvider = p;
        break;
      } else {
        const payload = {
          ...upstreamBody,
          ...(p.extraBody || {}),
          model: p.model,
        };

        const resp = await fetch(`${cleanBase(p.base)}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${p.key}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (resp.ok && resp.body) {
          activeResponse = resp;
          activeProvider = p;
          break;
        }
      }
    } catch (err) {
      clearTimeout(timer);
    }
  }

  // 若全部流式接口遇阻，返回兜底内容
  if (!activeResponse || !activeResponse.body) {
    const fallbackText =
      '天机暂晦，方才推演气场稍有波动。\n\n' +
      '【建议趋避】\n' +
      '1）稍候片刻重新问卜；\n' +
      '2）若上传了图片请将大小压缩在2MB以内；\n' +
      '3）可在下方点击【法器】直接使用六爻、摇签或塔罗起盘。\n\n' +
      '【玄机箴言】静水流深，急则生变；稍安勿躁，自有明断。';

    const sseFallback = `data: {"choices":[{"delta":{"content":${JSON.stringify(fallbackText)}}}]}\n\ndata: [DONE]\n\n`;
    return new Response(sseFallback, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'X-Diviner-Engine': 'xuanjizi-core',
        'X-Diviner-Route': 'xuanjizi',
      },
    });
  }

  // 建立双向流管道，并清洗内部思考标签
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = activeResponse.body.getReader();

  (async () => {
    let inThinkTag = false;
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            if (line.trim()) await writer.write(encoder.encode(line + '\n'));
            continue;
          }
          if (line.includes('[DONE]')) {
            await writer.write(encoder.encode('data: [DONE]\n\n'));
            continue;
          }

          try {
            const parsed = JSON.parse(line.slice(6));
            let delta = parsed.choices?.[0]?.delta?.content || '';

            // 过滤 think 标签
            if (delta.includes('<think>')) {
              inThinkTag = true;
              delta = delta.replace(/<think>[\s\S]*/, '');
            }
            if (inThinkTag) {
              if (delta.includes('</think>')) {
                inThinkTag = false;
                delta = delta.replace(/[\s\S]*<\/think>/, '');
              } else {
                delta = '';
              }
            }

            if (delta) {
              const outObj = { choices: [{ delta: { content: delta } }] };
              await writer.write(encoder.encode(`data: ${JSON.stringify(outObj)}\n\n`));
            }
          } catch {
            await writer.write(encoder.encode(line + '\n\n'));
          }
        }
      }
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (e) {
      // 流异常结束
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Diviner-Engine': 'xuanjizi-core',
      'X-Diviner-Route': 'xuanjizi',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
