# 玄机子 · Diviner

东方问卜站点。静态前端 + Cloudflare Pages Functions。问卜者在前台「法器（模型）选择器」中自主择选推演模型，所选模型 id 随请求体呈递服务端，由边缘函数映射到对应上游单线路直连。密钥、上游网关名称不出现在前端源码和浏览器响应头里；前台只见厂商图标与模型代号。

姊妹站：卦象问道（风水问答）`https://chuankangkk.top/`。两站首页与「关于」弹窗互相设有入口；改动任一站的入口文案或链接时，两边需同步。

## 真实目录

工程根即本仓库根目录。

```text
index.html                    问卜前台（法器选择器 markup、姊妹站入口）
styles.css                    低饱和黑金 / 朱砂印 / 东方术数主题
script.js                     只请求 /api/chat；MODEL_CATALOG 定义法器；排盘引擎；不含任何 Key
calendar.js                   历法查表库（jjonline/calendar.js），挂载 window.calendar
locales.js                    中英双语词典与 t()；data-i18n 静态文案在此
admin.html                    观象台后台（口令走请求头，不写进源码）
zan.jpg                       赞赏码图片
_headers                      安全头与缓存策略
wrangler.toml                 仅 KV / AI binding，无密钥
logos/                        真实厂商 logo（deepseek/qwen/zhipu/tencent/xiaomi）
functions/api/chat.js         服务端路由表：model id → 上游单线路直连；联网查证编排
functions/api/_search.js      联网查证：Brave（配置了 key 时优先）→ DuckDuckGo HTML 回退
functions/api/health.js       后台口令校验后只返回「是否已配置」
functions/api/admin/records.js
tests/calendar-baseline.mjs   历法基准校验（node --test）
tests/divination-chart.test.mjs 卦盘基准：六十四卦、八宫世应、纳甲、六亲、六神、旬空、三钱抛掷、梅花数理
tests/chat-protocol.test.mjs  问卜协议回归：模拟上游，覆盖跨站拒绝、兜底帧、限流重试、联网查证帧序
.github/workflows/ci.yml      CI：语法检查 + 历法基准校验
.dev.vars.example             本地空模板，禁止填真实值后提交
免费模型配置说明.md            线路与配置的说明（配置者视角）
```

GitHub：`1837620622/Diviner`
生产：`https://diviner.chuankangkk.top/`
Pages：`diviner` 项目，`diviner.pages.dev`

## 数据来源

- 问卜对话：浏览器 `POST /api/chat`，SSE 流式返回。请求体携带所选 `model` id、`messages`、`web_search`（联网查证开关）与 `lang`（`zh` / `en`）。
- 联网查证：开启时服务端先发 `search_phase` 帧（`searching` → `done` 或 `skipped`），资料以「【联网参详资料】」块注入 system 消息。搜索失败只写 `skipped` 帧，不阻断起卦。
- 英文模式：`lang` 为 `en` 时，服务端在 system 消息末尾追加英文作答指令。
- 密钥：只存在 Cloudflare Pages → Settings → Variables and Secrets。
- 问卜档案：KV `CHAT_LOGS`（binding 名必须是 `CHAT_LOGS`），记录含所选模型 id。
- Workers AI：`wrangler.toml` 的 `[ai] binding = "AI"`，保留备用，当前不作推演线路。

前端 `script.js` 里的 `SYSTEM_PROMPT` 只是给模型看的人设，不含上游地址和模型代号。`MODEL_CATALOG` 只含前台展示用的名称 / 厂商 / 能力 / 优劣，不含真实上游。

## 运行命令

本地（不要用生产密钥提交仓库）：

```bash
cp .dev.vars.example .dev.vars
# 仅在本机填写，.dev.vars 已被 gitignore
npx wrangler pages dev . --ai AI
```

生产部署：

```bash
npx wrangler pages deploy . --project-name=diviner --commit-dirty=true
```

Git 推送 `main` 也会触发 Pages 的 Git 集成部署。

## 测试方式

自动检查（与 CI 相同）：

```bash
for f in script.js calendar.js locales.js functions/api/*.js functions/api/admin/*.js; do node --check "$f"; done
node --test tests/calendar-baseline.mjs tests/chat-protocol.test.mjs tests/divination-chart.test.mjs
```

手工检查（部署后在线上核对）：

1. 前台：打开 `https://diviner.chuankangkk.top/`，发一句「以一句箴言回复：通达」。应看到流式中文，响应头不得出现模型 ID。
2. 法器选择器：输入框上方下拉列出 8 尊法器，默认首选置顶；带厂商 logo、图文/文字徽标、节奏与优劣；切换后记忆于 localStorage。
3. 浏览器 Network：`/api/chat` 请求体只含所选模型 id，不含 Key；响应头不含上游网关 / 真实模型代号。
4. 换一尊不支持读图的法器并附图：图片被服务端剔除，退化为纯文本推演，不报上游拒收。
5. 某线路失败：前台收到 `model_error` SSE 帧，提示「另择一尊法器」并自动展开选择器。
6. 后台：`/admin.html` 用 `ADMIN_PASSWORD` 登录。线路只显示是否点亮，不暴露上游。
7. 手机 390 宽：法器面板全宽展开不溢出，标题不被顶栏裁切。
8. 姊妹站：首页欢迎区与「关于」弹窗各有一处指向 `https://chuankangkk.top/` 的入口。

## 打包 / 发布

- 静态站点，无 npm 构建。
- GitHub 提交身份：`传康Kk <1837620622@qq.com>`。
- 发布前扫描：源码、README、示例文件不得出现真实 Key、个人推理域名、`sk-` / `gsk_` 字面量。
- Cloudflare 必须已配置（名称需一致，大小写敏感）：

```text
B_AI_API_KEY
GROQ_API_KEY
ZHIPU_API_KEY
ADMIN_PASSWORD
```

Workers AI Binding 名称：`AI`。

可选（不配置也可以）：

- `GROQ_MODEL`、`ZHIPU_MODEL`：覆盖默认上游模型名。未配置时函数内使用内置默认值，且不会把这些字符串返回给浏览器。
- `BRAVE_API_KEY`：联网查证优先使用 Brave Search；未配置则回退 DuckDuckGo HTML 检索。

## 服务端路由（对用户不可见）

前台所选 model id 由 `functions/api/chat.js` 的 `routeMap` 映射到对应上游，**单线路直连，不做跨模型静默兜底**。id → 上游（仅配置者可见）：

| 前台代号 | 上游 | 读图 |
| --- | --- | --- |
| qwen3.6（默认首选） | Groq | 是 |
| qwen3.8-flash | b.ai 聚合 | 否 |
| deepseek-v4-flash | b.ai 聚合 | 否 |
| deepseek-v4-flash-vision-exp | b.ai 聚合 | 是 |
| glm-5.3-flash | b.ai 聚合 | 否 |
| hy3 | b.ai 聚合 | 否 |
| mimo-v2.5 | b.ai 聚合 | 否 |
| glm-4.7-flash | 智谱开放平台 | 否 |

> b.ai 聚合网关一个 Key 覆盖 DeepSeek / 千问 / 智谱 / 混元 / 小米等免费模型。
> 推理类模型会先输出 `reasoning_content`，服务端只透传 `content`，思考链不外泄；
> 相应线路 `max_tokens` 已抬高（推理类 6000），避免思考耗尽 token 致正文为空。
> 所选模型不支持读图时，服务端自动剔除图片块，退化为纯文本推演。

失败对用户只表现为「另择一尊法器」，不出现供应商、真实模型 ID、状态码。

## 前端约定

- 只允许 `fetch('/api/chat')`。禁止在浏览器里拼第三方 API Host。
- 法器选择器只渲染厂商 logo 与模型代号，不暴露上游网关。
- 流式正文经过乱码修复：去掉思考标签、尝试把 UTF-8 被当成 Latin-1 的字节还原、去掉替换字符。
- 回复结构按四段小标题渲染：象数解析 / 吉凶趋避 / 可行建议 / 玄机箴言。模型兜底文案也须使用这四个标题。`formatDivinationContent` 同时识别旧的【建议趋避】并渲染为小标题，但它不属于四段结构，新代码不再使用。
- 联网参详来源只渲染 `http(s)` 链接；服务端 `_search.js` 同样只保留 `http(s)` 结果。
- 静态文案中英双份，位于 `locales.js`；新增 `data-i18n` 键须两种语言都写。

## 排盘引擎（确定性历法）

- `calendar.js`（jjonline/calendar.js，1900–2100 查表，数据源香港天文台）随页面加载并挂载 `window.calendar`。
- 农历⇄公历、年柱（立春分年）、月柱（节气换月）、日柱由查表得出；时柱由五鼠遁代码推算；晚子时（23:00–24:00）日柱顺推次日。
- 核心函数：`script.js` 的 `computeFourPillars()`（排盘）、`yearPillarBySolar()`（年柱以立春分年，排盘、今时此刻、黄历共用）、`currentDateBlock()`（今日干支注入 system 提示词）、`titleFromPrompt()`（会话标题去模板化）。
- 年柱不取 `solar2lunar` 的 `gzYear`：那是以春节为界的农历年，会让立春到春节之间的年柱错一年。
- 铁律：凡历法换算一律走引擎，模型只解读引擎给出的【定盘】，不得重算、改盘；system 提示词内已写入「定盘铁律」与实时【今时此刻】。
- 卦盘引擎（同在排盘引擎段内，纯函数）：`liuyaoChart()` 排六爻定盘（八宫世应、京房纳甲、六亲以本宫五行为我、六神依日干、旬空依日干支、动爻与变卦）；`meihuaChart()` 排梅花本互变三卦与体用生克。六十四卦由上下卦对照表给出，并与八宫推演交叉核对。
- 六爻提交时以【周易六爻定盘】呈递，逐爻自上而下；梅花以【梅花易数定盘】呈递。模型只解读，不另摇、不改盘。
- 梅花时间起卦（邵雍法）：上卦 = (农历年支序 + 农历月 + 农历日) ÷ 8，下卦 = 同一和加时辰序 ÷ 8，动爻 = 和加时辰序 ÷ 6；年支序子为 1 至亥为 12，时辰序子时（23:00–01:00）为 1。报数起卦：第一数÷8、第二数÷8、两数之和÷6。
- 基准校验（改历法代码后必跑 `node --test tests/calendar-baseline.mjs`）：农历一九九九年四月初一 = 公历 1999-05-15，四柱 己卯 己巳 丁卯（巳时乙巳），日主丁火。另含立春前后（2024、2026、1999 年）、小寒前子月、闰二月与闰四月的用例。

## 已知风险

- b.ai 免费档存在上游速率限制，拥挤时该线路可能回 `model_error`，前台引导另择法器。
- 智谱与 Groq 的默认模型名写在 Functions 里，不写进前端。若厂商改名，只改 `functions/api/chat.js` 或云端环境变量。b.ai 与智谱的模型名无法在离线环境核对；线上若出现「此模型暂不可用」，先对照厂商文档核对模型名。
- 八字与黄历干支已由前端历法引擎查表核定并随提示词上行；真太阳时校正（出生城市经度时差）仍依赖模型说明，未做代码级换算。
- 年柱以立春日为界，精确到日，未计交节时分：立春当日出生者，年柱一律按当日归为本年，与严格的交节时刻可能有出入。
- 卦盘未排伏神，互卦与变卦不附六亲；六爻的日辰、月建、旬空、六神取抛满六爻那一刻的日期，若跨日或跨节气，同一卦的旬空与月建会随之不同。
- 梅花时间起卦取当下的农历年支、农历月日与时辰，与标准做法一致；若需以起卦前的某一时刻为准，应由使用者另行指定。
- KV 中历史记录含所选模型 id，后台可按模型筛选。
- 本项目是文化体验与自省工具，不能替代医疗、法律、投资判断。
