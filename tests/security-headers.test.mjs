// 页面安全策略回归：CSP 随页面下发且脚本只许同源；页面不得写内联事件属性或内联脚本，
// 引用的本地文件须真实存在。改页面结构或 _headers 后须通过。
// 运行：node --test tests/security-headers.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

const csp = read('_headers').match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1]?.trim() ?? '';
const directives = new Map(
  csp
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values];
    }),
);

test('CSP 随页面下发，脚本只许同源，禁止 eval', () => {
  assert.ok(csp, '_headers 缺少 Content-Security-Policy');
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.ok(!csp.includes("'unsafe-eval'"), 'CSP 不得允许 eval');
});

for (const page of ['index.html', 'admin.html']) {
  test(`${page} 没有内联事件属性与内联脚本`, () => {
    const html = read(page);
    const handlers = html.match(/<[^>]*\son[a-z]+\s*=/gi) ?? [];
    assert.deepEqual(handlers, [], `内联事件属性：${handlers.join(' | ')}`);
    const inlineScripts = html.match(/<script\b(?![^>]*\bsrc=)[^>]*>/gi) ?? [];
    assert.deepEqual(inlineScripts, [], '内联脚本须移到独立文件');
  });

  test(`${page} 引用的本地脚本与样式文件都存在`, () => {
    const refs = [...read(page).matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/gi)]
      .map(([, ref]) => ref)
      .filter((ref) => !/^(?:https?:|data:|\/\/)/.test(ref));
    assert.ok(refs.length > 0, `${page} 未找到本地引用`);
    for (const ref of refs) {
      const file = ref.split('?')[0];
      assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${page} 引用了不存在的文件：${file}`);
    }
  });
}
