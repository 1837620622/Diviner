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
  `${scriptSrc.slice(engineStart, engineEnd)}\n;globalThis.engine = { computeFourPillars, currentDateBlock, yearPillarBySolar };`,
  sandbox,
);
const { computeFourPillars, currentDateBlock, yearPillarBySolar } = sandbox.engine;
const cal = sandbox.window.calendar;

// 公历输入的排盘，时辰取巳时（hourValue 10），只看年柱与月柱。
const solarPillars = (y, m, d) =>
  computeFourPillars({ y, m, d, hourValue: 10, calendarType: 'solar', isLeapMonth: false }).pillars;

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

test('年柱以立春为界：立春后、春节前已属本年（2024-02-05 甲辰，春节为 02-10）', () => {
  const p = solarPillars(2024, 2, 5);
  assert.equal(p.year, '甲辰');
  assert.equal(p.month, '丙寅');
});

test('立春前一日仍属上一年（2024-02-03 癸卯）', () => {
  const p = solarPillars(2024, 2, 3);
  assert.equal(p.year, '癸卯');
  assert.equal(p.month, '乙丑');
});

test('2026 年立春：02-03 乙巳 / 己丑，02-05 丙午 / 庚寅', () => {
  assert.deepEqual([solarPillars(2026, 2, 3).year, solarPillars(2026, 2, 3).month], ['乙巳', '己丑']);
  assert.deepEqual([solarPillars(2026, 2, 5).year, solarPillars(2026, 2, 5).month], ['丙午', '庚寅']);
});

test('1999 年立春：02-03 戊寅 / 乙丑，02-10 己卯 / 丙寅（春节 02-16）', () => {
  assert.deepEqual([solarPillars(1999, 2, 3).year, solarPillars(1999, 2, 3).month], ['戊寅', '乙丑']);
  assert.deepEqual([solarPillars(1999, 2, 10).year, solarPillars(1999, 2, 10).month], ['己卯', '丙寅']);
});

test('小寒前为子月：2024-01-05 癸卯 / 甲子，小寒后为丑月：2024-01-10 癸卯 / 乙丑', () => {
  assert.deepEqual([solarPillars(2024, 1, 5).year, solarPillars(2024, 1, 5).month], ['癸卯', '甲子']);
  assert.deepEqual([solarPillars(2024, 1, 10).year, solarPillars(2024, 1, 10).month], ['癸卯', '乙丑']);
});

test('yearPillarBySolar：年初属上一年，立春当日起属本年', () => {
  assert.equal(yearPillarBySolar(cal, 2024, 1, 1), '癸卯');
  assert.equal(yearPillarBySolar(cal, 2024, 2, 4), '甲辰');
  assert.equal(yearPillarBySolar(cal, 2024, 2, 3), '癸卯');
});

test('闰月换算：2023 闰二月初一 = 公历 2023-03-22；2020 闰四月初一 = 2020-05-23', () => {
  const a = cal.lunar2solar(2023, 2, 1, true);
  const b = cal.lunar2solar(2020, 4, 1, true);
  assert.deepEqual([a.cYear, a.cMonth, a.cDay], [2023, 3, 22]);
  assert.deepEqual([b.cYear, b.cMonth, b.cDay], [2020, 5, 23]);
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
