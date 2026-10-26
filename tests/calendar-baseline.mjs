// 历法基准校验（AGENTS.md「基准校验」的可执行版本）。
// 改动 calendar.js 或 script.js 的排盘段之后运行：node --test tests/calendar-baseline.mjs
// 只抽取 script.js 中「确定性排盘引擎」一段执行，不启动页面脚本本身。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const scriptSrc = read('script.js');
const engineStart = scriptSrc.indexOf('// ==================== 确定性排盘引擎');
const engineEnd = scriptSrc.indexOf('// 22 张大阿卡纳塔罗牌数据');
assert.ok(engineStart >= 0 && engineEnd > engineStart, 'script.js 中找不到排盘引擎段落标记');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('calendar.js'), sandbox);
vm.runInContext(
  `${scriptSrc.slice(engineStart, engineEnd)}\n;globalThis.engine = { computeFourPillars, currentDateBlock };`,
  sandbox,
);
const { computeFourPillars, currentDateBlock } = sandbox.engine;
const cal = sandbox.window.calendar;

test('农历一九九九年四月初一 = 公历 1999-05-15', () => {
  const conv = cal.lunar2solar(1999, 4, 1, false);
  assert.deepEqual([conv.cYear, conv.cMonth, conv.cDay], [1999, 5, 15]);
});

test('基准盘：己卯 己巳 丁卯，巳时乙巳，日主丁火', () => {
  const chart = computeFourPillars({ y: 1999, m: 4, d: 1, hourValue: 9, calendarType: 'lunar', isLeapMonth: false });
  assert.equal(chart.pillars.year, '己卯');
  assert.equal(chart.pillars.month, '己巳');
  assert.equal(chart.pillars.day, '丁卯');
  assert.equal(chart.pillars.hour, '乙巳');
  assert.equal(chart.dayMaster.stem, '丁');
  assert.equal(chart.dayMaster.element, '火');
});

test('同一天按公历或农历输入，日柱一致', () => {
  const lunar = computeFourPillars({ y: 1999, m: 4, d: 1, hourValue: 9, calendarType: 'lunar', isLeapMonth: false });
  const solar = computeFourPillars({ y: 1999, m: 5, d: 15, hourValue: 9, calendarType: 'solar', isLeapMonth: false });
  assert.equal(solar.pillars.day, lunar.pillars.day);
});

test('年柱按立春分年：2026 年为丙午', () => {
  assert.equal(cal.solar2lunar(2026, 10, 26).gzYear, '丙午');
});

test('晚子时（23:00）日柱顺推至次日', () => {
  const late = computeFourPillars({ y: 1999, m: 5, d: 15, hourValue: 23, calendarType: 'solar', isLeapMonth: false });
  assert.equal(late.pillars.day, cal.solar2lunar(1999, 5, 16).gzDay);
});

test('非法农历日期返回 null', () => {
  assert.equal(computeFourPillars({ y: 1999, m: 4, d: 31, hourValue: 9, calendarType: 'lunar', isLeapMonth: false }), null);
});

test('今时此刻块含公历日期', () => {
  assert.match(currentDateBlock(), /【今时此刻】今天是公历 \d{4} 年/);
});
