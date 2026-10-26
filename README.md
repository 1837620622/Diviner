# 玄机子 · Diviner

东方问卜交互站点 + Cloudflare Pages Functions，问卜者可在前台自主择选推演模型（法器）。

- 生产：https://diviner.chuankangkk.top/
- 姊妹站（风水）：卦象问道 https://chuankangkk.top/ ，两站首页与「关于」弹窗互相设有入口

## 功能概览

- **问卜法器**：六爻、梅花易数、四柱八字、小六壬、灵犀塔罗、观象灵签、择吉黄历、周公解梦、木鱼，各有仪式流程与程序化音效。
- **法器（模型）选择器**：输入框上方下拉列出 8 尊推演模型，选择记忆于本地。所选 id 随请求呈递服务端，单线路直连，不做跨模型静默兜底；失败时提示另择法器。
- **排盘引擎**：农历⇄公历、年柱（立春分年）、月柱（节气换月）、日柱与时柱由 `calendar.js` 查表与代码换算，模型只解读定盘，不重算。
- **联网参详**：可选开启。服务端先检索资料并以进程帧播报，回答中的来源附链接；未配置 Brave key 时回退 DuckDuckGo。
- **中英双语**：右上角切换；英文模式下服务端也以英文作答。
- **本机记忆**：会话保存在浏览器本地；命主档案随系统提示词携带。
- **观象台后台**：`/admin.html` 用 `ADMIN_PASSWORD` 登录，查看问卜记录，可按日期、模型筛选。

## 目录

```text
index.html                     问卜前台
styles.css                     主题样式
script.js                      前端逻辑、MODEL_CATALOG、排盘引擎
calendar.js                    历法查表库
locales.js                     中英双语词典
admin.html                     观象台后台
functions/api/chat.js          问卜接口：路由表、限流、联网查证编排、流式转发
functions/api/_search.js       联网查证（Brave / DuckDuckGo）
functions/api/health.js        后台线路状态
functions/api/admin/records.js 后台记录接口
tests/calendar-baseline.mjs    历法基准校验
tests/chat-protocol.test.mjs   问卜协议回归（模拟上游）
.github/workflows/ci.yml       CI
wrangler.toml                  Pages 配置（仅 KV / AI binding）
_headers                       安全头与缓存策略
.dev.vars.example              本地环境变量模板
免费模型配置说明.md             线路与配置说明
AGENTS.md                      工程约定与维护说明
assets/ logos/ zan.jpg
```

## Cloudflare 配置

在 Pages 项目 → Settings → Variables and Secrets 中至少设置：

```text
B_AI_API_KEY
GROQ_API_KEY
ZHIPU_API_KEY
ADMIN_PASSWORD
```

可选：`GROQ_MODEL`、`ZHIPU_MODEL`（覆盖默认上游模型名）、`BRAVE_API_KEY`（联网查证）。

Workers AI 绑定名为 `AI`（保留备用，当前不作推演线路）。模型 id 到上游的映射只写在 Pages Function 里，不会下发到浏览器。

KV：问卜档案写入绑定 `CHAT_LOGS`，`wrangler.toml` 已沿用原 namespace。若部署到其他 Cloudflare 账号，请换成该账号下新建的 namespace ID。

## 本地开发

```bash
cp .dev.vars.example .dev.vars
# 在 .dev.vars 中填本地测试 Key（已被 .gitignore，切勿提交）
npx wrangler pages dev . --ai AI
```

## 测试

```bash
node --test tests/calendar-baseline.mjs tests/chat-protocol.test.mjs
```

CI（`.github/workflows/ci.yml`）另做全部 Functions 与前端脚本的语法检查。

## 部署

```bash
npx wrangler pages deploy . --project-name=diviner --commit-dirty=true
```

推送 `main` 分支也会触发 Pages 的 Git 集成部署。

## 使用边界

本项目适合作为传统文化体验、反思和娱乐工具。历法、医疗、法律、金融等高风险事项不要仅依据模型生成内容作决定。
