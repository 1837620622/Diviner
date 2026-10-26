// 图标回归：页面和脚本用到的每个 data-lucide 图标都要在 assets/lucide-subset.js 里。
// 缺一个图标，页面上就会静默少一个，所以在这里卡住；子集体积也设上限，防止整包被再次引入。
// 运行：node --test tests/icons.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const PAGE_FILES = ['index.html', 'admin.html', 'script.js', 'admin.js'];

const subsetSource = read('assets/lucide-subset.js');
const sandbox = { window: {}, console };
vm.runInNewContext(subsetSource, sandbox);
const { icons } = sandbox.window.lucide;

const quoted = (s) => [...s.matchAll(/['"]([a-z][a-z0-9-]*)['"]/g)].map((m) => m[1]);

// 三种写法：静态 data-lucide="name"；模板里的 data-lucide="${三元表达式}"；
// 脚本里的 setAttribute('data-lucide', 'name' 或三元表达式)。
function usedIconNames() {
  const names = new Set();
  for (const file of PAGE_FILES) {
    const text = read(file);
    for (const [, value] of text.matchAll(/data-lucide="([^"]*)"/g)) {
      if (value.includes('${')) {
        for (const [, expr] of value.matchAll(/\$\{([^}]*)\}/g)) quoted(expr).forEach((n) => names.add(n));
      } else if (value) {
        names.add(value);
      }
    }
    for (const [, arg] of text.matchAll(/setAttribute\(\s*['"]data-lucide['"]\s*,\s*([^)]*)\)/g)) {
      quoted(arg).forEach((n) => names.add(n));
    }
  }
  return [...names].sort();
}

test('子集导出 createIcons 与图标表', () => {
  assert.equal(typeof sandbox.window.lucide.createIcons, 'function');
  assert.ok(Object.keys(icons).length > 0);
});

test('页面和脚本用到的每个 data-lucide 图标都在子集里', () => {
  const names = usedIconNames();
  assert.ok(names.length > 0, '没有扫描到任何图标名，检查扫描规则');
  const missing = names.filter((n) => !Object.prototype.hasOwnProperty.call(icons, n));
  assert.deepEqual(missing, [], `缺少图标：${missing.join(', ')}`);
});

test('子集体积保持在 40 KB 以内，不会整包回退', () => {
  assert.ok(Buffer.byteLength(subsetSource) < 40_000, `子集 ${Buffer.byteLength(subsetSource)} 字节`);
});
