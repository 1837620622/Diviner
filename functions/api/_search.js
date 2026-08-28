// 玄机子 · 联网查证搜索模块
// Pages Functions 中下划线开头的文件不会成为路由，本文件是纯模块，
// 由 chat.js 引入，为问卜接口提供「联网查证」能力。
//
// 线路策略：
//   1. 优先 Brave Search API（需环境变量 BRAVE_API_KEY）；
//      端点 https://api.search.brave.com/res/v1/web/search，
//      鉴权头 X-Subscription-Token，结果位于响应 JSON 的 web.results[]。
//   2. 无 key、调用失败或零结果时，回退抓取 DuckDuckGo HTML 端点
//      https://html.duckduckgo.com/html/?q=...，以正则解析，不引第三方库。
//      结果标题在 <a class="result__a"> 内，摘要在 class="result__snippet" 内，
//      真实链接被包在 //duckduckgo.com/l/?uddg=<百分号编码URL>&rut=... 重定向里，
//      需解出 uddg 参数并做百分号解码。
//
// 约定：整次搜索用 AbortController 套总超时；内部吞掉一切异常，
// 永不向调用方抛出——查证失败绝不阻断正常起卦。

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const DDG_ENDPOINT = 'https://html.duckduckgo.com/html/';

// 类浏览器 UA：DDG HTML 端点对无 UA / 明显机器人的请求可能回 202 首页（无结果）。
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SNIPPET_LIMIT = 300; // 单条摘要最大字数

// ── 通用工具 ─────────────────────────────────────────────────────────────

// 去除 HTML 标签、解码常见实体、归一空白。
function stripHtml(input) {
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ' '; }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCodePoint(Number(dec)); } catch { return ' '; }
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// 截断文本至多 n 字。
function clipText(text, n) {
  const s = String(text || '');
  return s.length > n ? s.slice(0, n) : s;
}

// 解开 DDG 重定向 href，取出真实目标 URL。
// 形态：//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&rut=...
// 或 https://duckduckgo.com/l/?uddg=...；也可能已是直链 https://...。
// 注意 HTML 属性里的 & 被实体化为 &amp;，需先还原再取参数。
function decodeDdgHref(href) {
  let h = String(href || '').trim().replace(/&amp;/gi, '&');
  if (!h) return '';
  if (h.startsWith('//')) h = `https:${h}`;
  // 非 DDG 重定向的绝对地址：原样返回。
  if (/^https?:\/\//i.test(h) && !/duckduckgo\.com\/l\//i.test(h)) return h;
  const m = h.match(/[?&]uddg=([^&]+)/i);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  }
  return /^https?:\/\//i.test(h) ? h : '';
}

// ── 线路一：Brave Search API ─────────────────────────────────────────────

async function searchBrave(apiKey, query, max, signal) {
  // count 上限 20、下限 1；safesearch 取 moderate（off/moderate/strict 三档）。
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(max, 1), 20)),
    safesearch: 'moderate',
  });
  const resp = await fetch(`${BRAVE_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    signal,
  });
  if (!resp.ok) {
    try { await resp.body?.cancel(); } catch { /* 忽略 */ }
    throw new Error(`brave http ${resp.status}`);
  }
  const data = await resp.json();
  const results = Array.isArray(data?.web?.results) ? data.web.results : [];
  const sources = [];
  for (const r of results) {
    const url = String(r?.url || '').trim();
    if (!url) continue;
    const title = clipText(stripHtml(r?.title), SNIPPET_LIMIT);
    const snippet = clipText(stripHtml(r?.description), SNIPPET_LIMIT);
    if (!title && !snippet) continue;
    sources.push({ title, url, snippet });
    if (sources.length >= max) break;
  }
  return sources;
}

// ── 线路二：DuckDuckGo HTML 端点抓取 ─────────────────────────────────────

// 以正则解析 DDG HTML 结果页：逐条取 result__a 标题链接，
// 再在其后 4000 字窗口内找同一条结果的 result__snippet 摘要。
function parseDdgHtml(htmlText, max) {
  const sources = [];
  const seen = new Set();
  const openTagRe = /<a\b[^>]*\bresult__a\b[^>]*>/gi;
  let m;
  while ((m = openTagRe.exec(htmlText)) !== null && sources.length < max) {
    const tag = m[0];
    if (/result--ad/i.test(tag)) continue; // 跳过广告位
    const hrefMatch = tag.match(/href="([^"]*)"/i);
    const url = decodeDdgHref(hrefMatch ? hrefMatch[1] : '');
    if (!url || seen.has(url)) continue;

    const afterTag = htmlText.slice(m.index + tag.length);
    const closeIdx = afterTag.toLowerCase().indexOf('</a>');
    const rawTitle = closeIdx === -1 ? '' : afterTag.slice(0, closeIdx);
    const title = clipText(stripHtml(rawTitle), SNIPPET_LIMIT);
    if (!title) continue;

    // 摘要节点：class 含 result__snippet，内容可能带 <b> 高亮标签。
    const windowText = afterTag.slice(0, 4000);
    const snipMatch = windowText.match(/<[^>]*\bresult__snippet\b[^>]*>([\s\S]*?)<\/[a-z][^>]*>/i);
    const snippet = snipMatch ? clipText(stripHtml(snipMatch[1]), SNIPPET_LIMIT) : '';

    seen.add(url);
    sources.push({ title, url, snippet });
  }
  return sources;
}

async function searchDuckDuckGo(query, max, signal) {
  const url = `${DDG_ENDPOINT}?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    signal,
  });
  // DDG 反爬时会以 202 回首页（无任何结果），属「软封禁」，须当失败处理。
  if (resp.status === 202 || !resp.ok) {
    try { await resp.body?.cancel(); } catch { /* 忽略 */ }
    throw new Error(`duckduckgo http ${resp.status}`);
  }
  const htmlText = await resp.text();
  // 2xx 但页面里没有结果锚点：同样视为软封禁或无结果。
  if (!/result__a/i.test(htmlText)) throw new Error('duckduckgo no results');
  return parseDdgHtml(htmlText, max);
}

// ── 对外入口 ─────────────────────────────────────────────────────────────

// 联网搜索。成功返回 { ok: true, provider, sources: [{title, url, snippet}] }，
// 失败返回 { ok: false, reason }；任何异常都在内部消化，绝不抛出。
export async function webSearch(env, query, { max = 5, timeoutMs = 8000 } = {}) {
  const q = clipText(String(query || '').trim(), 400); // Brave 单次查询上限 400 字符
  if (!q) return { ok: false, reason: '查询为空' };

  const want = Math.min(Math.max(Number(max) || 5, 1), 10);
  const controller = new AbortController();
  // 整次搜索（含 Brave 尝试与 DDG 回退）共用一个总超时。
  const timer = setTimeout(() => controller.abort(), Math.max(Number(timeoutMs) || 8000, 1000));

  try {
    const braveKey = String(env?.BRAVE_API_KEY || '').trim();
    if (braveKey) {
      try {
        const sources = await searchBrave(braveKey, q, want, controller.signal);
        if (sources.length) return { ok: true, provider: 'brave', sources };
        // 零结果：继续回退 DuckDuckGo。
      } catch (err) {
        if (err?.name === 'AbortError') return { ok: false, reason: '搜索超时' };
        // 其余错误（密钥失效、限流、网络等）：静默回退。
      }
    }

    try {
      const sources = await searchDuckDuckGo(q, want, controller.signal);
      if (sources.length) return { ok: true, provider: 'duckduckgo', sources };
      return { ok: false, reason: '未取得结果' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, reason: '搜索超时' };
      return { ok: false, reason: '搜索服务暂不可用' };
    }
  } catch (err) {
    // 兜底：理论上走不到这里，仍确保永不抛出。
    return { ok: false, reason: String(err?.message || '搜索出错') };
  } finally {
    clearTimeout(timer);
  }
}
