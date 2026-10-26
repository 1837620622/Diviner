// 卦盘引擎基准校验：六十四卦、八宫世应、京房纳甲、六亲、六神、旬空、三钱抛掷、梅花数理。
// 期望值按标准规则手工核对（八宫与纳甲取京房体系）。运行：node --test tests/divination-chart.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptSrc = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const start = scriptSrc.indexOf('// ==================== 确定性排盘引擎');
const end = scriptSrc.indexOf('// 22 张大阿卡纳塔罗牌数据');
assert.ok(start >= 0 && end > start, 'script.js 中找不到排盘与卦盘引擎段落标记');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'calendar.js'), 'utf8'), sandbox);
vm.runInContext(
  `${scriptSrc.slice(start, end)}\n;globalThis.engine = { LY_HEX_BY_KEY, LY_PALACE_BY_KEY, LY_HEXAGRAMS, liuyaoChart, liuyaoTossSum, liuqinOf, liuyaoPromptBlock, meihuaNumberCasting, meihuaTimeCasting, meihuaChart, meihuaPromptBlock, relationTiYong };`,
  sandbox,
);
const E = sandbox.engine;

// 引擎在 vm 沙箱中运行，返回值与测试文件不在同一 realm；经 JSON 往返转为普通对象后再比较。
const plain = (x) => JSON.parse(JSON.stringify(x));

// 按卦名取二进制（自下而上）
const bitsByName = (name) => {
  const hit = [...E.LY_HEX_BY_KEY.entries()].find(([, v]) => v.name === name);
  assert.ok(hit, `卦表无「${name}」`);
  return hit[0].split('').map(Number);
};
// 全静爻：阳 7、阴 8
const staticValues = (bits) => bits.map(b => (b ? 7 : 8));
const chartOf = (name, dayGz = '甲子', monthGz = '丙寅') => plain(E.liuyaoChart(staticValues(bitsByName(name)), dayGz, monthGz));
const nayinsOf = (chart) => chart.lines.map(l => l.nayin);
const liuqinsOf = (chart) => chart.lines.map(l => l.liuqin);
const palaceOf = (name) => {
  const key = bitsByName(name).join('');
  const p = E.LY_PALACE_BY_KEY.get(key);
  return [p.palace.name, p.shi];
};

test('六十四卦：共 64 个，卦名与二进制一一对应', () => {
  assert.equal(E.LY_HEXAGRAMS.length, 64);
  assert.equal(E.LY_HEX_BY_KEY.size, 64);
  assert.equal(new Set(E.LY_HEXAGRAMS.map(h => h[0])).size, 64);
});

test('八宫推演覆盖全部 64 卦：与卦表的二进制完全一致', () => {
  assert.equal(E.LY_PALACE_BY_KEY.size, 64);
  for (const key of E.LY_HEX_BY_KEY.keys()) assert.ok(E.LY_PALACE_BY_KEY.has(key), `八宫缺 ${key}`);
});

test('八宫世位：乾宫、坎宫、离宫、艮宫各八卦的宫位与世爻', () => {
  const expected = {
    乾宫: { 乾为天: 6, 天风姤: 1, 天山遁: 2, 天地否: 3, 风地观: 4, 山地剥: 5, 火地晋: 4, 火天大有: 3 },
    坎宫: { 坎为水: 6, 水泽节: 1, 水雷屯: 2, 水火既济: 3, 泽火革: 4, 雷火丰: 5, 地火明夷: 4, 地水师: 3 },
    离宫: { 离为火: 6, 火山旅: 1, 火风鼎: 2, 火水未济: 3, 山水蒙: 4, 风水涣: 5, 天水讼: 4, 天火同人: 3 },
    艮宫: { 艮为山: 6, 山火贲: 1, 山天大畜: 2, 山泽损: 3, 火泽睽: 4, 天泽履: 5, 风泽中孚: 4, 风山渐: 3 },
  };
  for (const [palace, hexes] of Object.entries(expected)) {
    for (const [name, shi] of Object.entries(hexes)) {
      assert.deepEqual(palaceOf(name), [palace.replace('宫', ''), shi], `${name} 应属${palace}第${shi}爻为世`);
    }
  }
});

test('纳甲：八纯卦内外卦干支（京房体系）', () => {
  assert.deepEqual(nayinsOf(chartOf('乾为天')), ['甲子', '甲寅', '甲辰', '甲午', '甲申', '甲戌']);
  assert.deepEqual(nayinsOf(chartOf('坤为地')), ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉']);
  assert.deepEqual(nayinsOf(chartOf('震为雷')), ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌']);
  assert.deepEqual(nayinsOf(chartOf('巽为风')), ['辛丑', '辛卯', '辛巳', '辛未', '辛酉', '辛亥']);
  assert.deepEqual(nayinsOf(chartOf('坎为水')), ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子']);
  assert.deepEqual(nayinsOf(chartOf('离为火')), ['己卯', '己巳', '己未', '己酉', '己亥', '己丑']);
  assert.deepEqual(nayinsOf(chartOf('艮为山')), ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅']);
  assert.deepEqual(nayinsOf(chartOf('兑为泽')), ['丁巳', '丁未', '丁酉', '丁亥', '丁丑', '丁卯']);
});

test('六亲：以本宫五行为我（乾宫属金，坤宫属土）', () => {
  assert.deepEqual(liuqinsOf(chartOf('乾为天')), ['子孙', '妻财', '父母', '官鬼', '兄弟', '父母']);
  assert.deepEqual(liuqinsOf(chartOf('坤为地')), ['兄弟', '父母', '官鬼', '兄弟', '妻财', '子孙']);
});

test('世应：八纯卦世在上爻，应在三爻；游魂、归魂按八宫定义', () => {
  const pick = (name) => { const c = chartOf(name); return [c.shi, c.ying]; };
  assert.deepEqual(pick('乾为天'), [6, 3]);
  assert.deepEqual(pick('天风姤'), [1, 4]);
  assert.deepEqual(pick('地火明夷'), [4, 1]);
  assert.deepEqual(pick('火水未济'), [3, 6]);
  assert.deepEqual(pick('坎为水'), [6, 3]);
});

test('六神：依日干定初爻所临，自初至上循环', () => {
  const jia = chartOf('乾为天', '甲子');
  assert.equal(jia.lines[0].shen, '青龙');
  assert.equal(jia.lines[5].shen, '玄武');
  const bing = chartOf('乾为天', '丙寅');
  assert.equal(bing.lines[0].shen, '朱雀');
  const ren = chartOf('乾为天', '壬子');
  assert.deepEqual(ren.lines.slice(0, 2).map(l => l.shen), ['玄武', '青龙']);
});

test('旬空：甲子旬空戌亥，甲申旬空午未，甲午旬空辰巳，癸酉仍属甲子旬', () => {
  assert.deepEqual(chartOf('乾为天', '甲子').kong, ['戌', '亥']);
  assert.deepEqual(chartOf('乾为天', '甲申').kong, ['午', '未']);
  assert.deepEqual(chartOf('乾为天', '甲午').kong, ['辰', '巳']);
  assert.deepEqual(chartOf('乾为天', '癸酉').kong, ['戌', '亥']);
});

test('三钱抛掷：正反等概，六、七、八、九的比例为 1:3:3:1', () => {
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  for (let mask = 0; mask < 8; mask++) {
    const seq = [0, 1, 2].map(i => ((mask >> i) & 1 ? 0.9 : 0.1));
    let k = 0;
    counts[E.liuyaoTossSum(() => seq[k++])] += 1;
  }
  assert.deepEqual(counts, { 6: 1, 7: 3, 8: 3, 9: 1 });
});

test('三钱抛掷：正面（随机数 > 0.5）计 3，反面计 2', () => {
  assert.equal(E.liuyaoTossSum(() => 0.9), 9);
  assert.equal(E.liuyaoTossSum(() => 0.1), 6);
});

test('变卦与动爻：6 老阴动变阳、9 老阳动变阴；本卦、变卦、动爻位置均按初爻起算', () => {
  const c = E.liuyaoChart([6, 7, 8, 9, 7, 8], '甲子', '丙寅');
  assert.equal(c.ben.name, '泽水困');
  assert.equal(c.bian.name, '水泽节');
  assert.deepEqual(c.moving, [1, 4]);
  assert.equal(c.lines[0].moving, true);
  assert.equal(c.lines[1].moving, false);
});

test('非法爻值或爻数不对：返回 null', () => {
  assert.equal(E.liuyaoChart([5, 7, 8, 9, 7, 8], '甲子', '丙寅'), null);
  assert.equal(E.liuyaoChart([7, 8, 9], '甲子', '丙寅'), null);
});

test('无日干支时：六神、旬空留空，不编造', () => {
  const c = plain(E.liuyaoChart(staticValues(bitsByName('乾为天')), '', ''));
  assert.equal(c.dayGz, '');
  assert.equal(c.monthBranch, '');
  assert.deepEqual(c.kong, []);
  assert.ok(c.lines.every(l => l.shen === '' && l.kong === false));
});

test('六爻定盘文本：含本卦、变卦、动爻、逐爻与引擎说明', () => {
  const c = E.liuyaoChart([6, 7, 8, 9, 7, 8], '甲子', '丙寅');
  const text = E.liuyaoPromptBlock(c, '问事业');
  assert.match(text, /^【周易六爻定盘】/);
  assert.match(text, /本卦：泽水困（上兑／下坎）/);
  assert.match(text, /变卦：水泽节（上坎／下兑）/);
  assert.match(text, /动爻：第1爻、第4爻/);
  assert.match(text, /逐爻（自上至下）：\n第6爻/);
  assert.match(text, /照盘直断即可/);
});

test('梅花数理（报数）：第一数÷8 为上卦，第二数÷8 为下卦，和÷6 为动爻，余 0 按 8、6 论', () => {
  assert.deepEqual(plain(E.meihuaNumberCasting(3, 8)), { up: 3, down: 8, dong: 5 });
  assert.deepEqual(plain(E.meihuaNumberCasting(8, 16)), { up: 8, down: 8, dong: 6 });
});

test('梅花数理（时间）：年支、农历月、农历日、时辰相加，取 8 与 6 的余数', () => {
  // 2026 丙午年（午为第 7 支）、农历九月十七、申时（第 9 辰）：上卦 33%8=1，下卦 42%8=2，动爻 42%6=0→6
  assert.deepEqual(plain(E.meihuaTimeCasting(7, 9, 17, 9)), { up: 1, down: 2, dong: 6 });
});

test('梅花卦盘：天泽履（上乾下兑）动六爻，互卦风火家人，变卦兑为泽，体用比和', () => {
  const c = E.meihuaChart(1, 2, 6);
  assert.equal(c.ben.name, '天泽履');
  assert.equal(c.hu.name, '风火家人');
  assert.equal(c.bian.name, '兑为泽');
  assert.equal(c.ti, '兑');
  assert.equal(c.yong, '乾');
  assert.equal(c.relation, '比和');
});

test('梅花卦盘：火地晋动五爻，体为下坤、用为上离，用生体', () => {
  const c = E.meihuaChart(3, 8, 5);
  assert.equal(c.ben.name, '火地晋');
  assert.equal(c.bian.name, '天地否');
  assert.equal(c.hu.name, '水山蹇');
  assert.equal(c.ti, '坤');
  assert.equal(c.yong, '离');
  assert.equal(c.relation, '用生体');
});

test('体用生克：五行相生相克的五种关系', () => {
  assert.equal(E.relationTiYong('木', '木'), '比和');
  assert.equal(E.relationTiYong('土', '火'), '用生体');
  assert.equal(E.relationTiYong('火', '土'), '体生用');
  assert.equal(E.relationTiYong('木', '土'), '体克用');
  assert.equal(E.relationTiYong('金', '火'), '用克体');
});

test('梅花定盘文本：含起卦方式、本互变三卦与体用', () => {
  const c = E.meihuaChart(3, 8, 5);
  const text = E.meihuaPromptBlock('报数数理 (3, 8) 起卦', { ...c, upNo: 3, downNo: 8 });
  assert.match(text, /^【梅花易数定盘】/);
  assert.match(text, /本卦：火地晋（上离／下坤）/);
  assert.match(text, /体用：体卦坤（土），用卦离（火），用生体/);
});
