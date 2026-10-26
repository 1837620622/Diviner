// 问卜协议回归：用模拟 fetch 跑 Pages Function，不触达真实上游，也不消耗配额。
// 覆盖跨站拒绝、无密钥兜底帧、思考标签剥离、限流重试、联网查证帧序与来源过滤。
// 运行：node --test tests/chat-protocol.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequestPost } from '../functions/api/chat.js';
import { webSearch } from '../functions/api/_search.js';

let mock = null;
globalThis.fetch = async (url, init) => {
  if (!mock) throw new Error(`unexpected fetch ${url}`);
  return mock(String(url), init);
};

const sseResponse = (chunks) => {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
};

const frames = (text) => text.split('\n\n').filter(Boolean).map((b) => b.replace(/^data: /, ''));
const parsed = (text) => frames(text).filter((f) => f !== '[DONE]').map((f) => JSON.parse(f));

let ipSeq = 0;
async function post(body, env = {}, headers = {}) {
  ipSeq += 1;
  const request = new Request('https://diviner.example/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `198.51.100.${ipSeq % 250}`, ...headers },
    body: JSON.stringify(body),
  });
  const res = await onRequestPost({ request, env, waitUntil() {} });
  return { status: res.status, text: await res.text() };
}

const userMsg = (content) => [{ role: 'user', content }];

test('跨站 Origin 被拒，返回 403', async () => {
  const { status } = await post({ model: 'qwen3.6', messages: userMsg('你好') }, {}, { Origin: 'https://evil.example' });
  assert.equal(status, 403);
});

test('所选线路没有密钥时回 model_error 帧并以 [DONE] 收尾', async () => {
  const { status, text } = await post({ model: 'glm-4.7-flash', messages: userMsg('你好') });
  assert.equal(status, 200);
  assert.equal(parsed(text)[0].model_error, true);
  assert.equal(frames(text).at(-1), '[DONE]');
});

test('正文去掉思考标签，按帧转发', async () => {
  mock = () => sseResponse([
    'data: {"choices":[{"delta":{"content":"<think>内部推理</think>你好"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"，世界"}}]}\n\n',
    'data: [DONE]\n\n',
  ]);
  const { text } = await post({ model: 'qwen3.6', messages: userMsg('你好') }, { GROQ_API_KEY: 'g' });
  const content = parsed(text).map((o) => o.choices?.[0]?.delta?.content ?? '').join('');
  assert.equal(content, '你好，世界');
  assert.equal(frames(text).at(-1), '[DONE]');
});

test('上游限流时同线路重试一次，仍失败则回 model_error 与限流文案', async () => {
  let calls = 0;
  mock = () => { calls += 1; return new Response('rate', { status: 429 }); };
  const { text } = await post({ model: 'qwen3.6', messages: userMsg('你好') }, { GROQ_API_KEY: 'g' });
  const first = parsed(text)[0];
  assert.equal(first.model_error, true);
  assert.match(first.message, /灵台稍显拥挤/);
  assert.equal(calls, 2);
});

test('联网查证：先 searching，再 done（只含 http(s) 来源），最后转发正文', async () => {
  mock = (url) => {
    if (url.startsWith('https://api.search.brave.com/')) {
      return new Response(JSON.stringify({ web: { results: [
        { url: 'javascript:alert(1)', title: '坏链接', description: 'x' },
        { url: 'https://example.com/a', title: '好来源', description: '摘要' },
      ] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return sseResponse(['data: {"choices":[{"delta":{"content":"据资料所言"}}]}\n\n', 'data: [DONE]\n\n']);
  };
  const { text } = await post(
    { model: 'qwen3.6', web_search: true, search_query: '财位', messages: userMsg('财位在哪') },
    { GROQ_API_KEY: 'g', BRAVE_API_KEY: 'b' },
  );
  const list = parsed(text);
  assert.equal(list[0].search_phase, 'searching');
  const done = list.find((o) => o.search_phase === 'done');
  assert.ok(done, '应有 done 帧');
  assert.deepEqual(done.sources.map((s) => s.url), ['https://example.com/a']);
  assert.ok(list.some((o) => o.choices?.[0]?.delta?.content === '据资料所言'));
});

test('DuckDuckGo 回退：uddg 指向非网页协议的结果被丢弃', async () => {
  const html = '<html>'
    + '<a class="result__a" href="//duckduckgo.com/l/?uddg=javascript%3Aalert(1)&amp;rut=x">坏</a>'
    + '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fb&amp;rut=y">好</a>'
    + '<div class="result__snippet">摘要二</div></html>';
  mock = () => new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
  const result = await webSearch({}, '财位');
  assert.equal(result.ok, true);
  assert.deepEqual(result.sources.map((s) => s.url), ['https://example.org/b']);
});
