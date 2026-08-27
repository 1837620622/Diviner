# 玄机子 · Diviner v8.3

东方问卜交互站点 + Cloudflare Pages Functions，问卜者可在前台自主择选推演模型（法器）。

## 本版重点

### 前端

- 补全法器弹窗缺失样式：梅花三卦横排、签筒、标签页、附件缩略图、关于页、海报预览；桌面端不再显示汉堡/关闭侧栏按钮。
- 修复塔罗翻牌后牌名看不清、八字显示成小时数字、六爻满卦后无法重摇、新建会话残留附图等问题。
- 视觉重构为低饱和黑金、朱砂印、星图与东方术数仪式体系，减少通用聊天机器人 / SaaS 界面感。
- 首页新增“定念 → 取象 → 明断”仪式流程、浑天轮盘、星云/卦字缓动、法门门扉微交互。
- 参考沉浸式塔罗产品的交互思路，把塔罗改为“洗牌 → 落牌 → 用户亲手逐张翻牌 → 呈递解读”，不再自动翻完。
- 九种法器使用不同程序化音色：塔罗洗牌/翻牌、六爻铜钱、梅花钟磬、小六壬点宫、八字低钟、灵签竹筹、梦境泛音、木鱼、黄历均不同。
- 音效由 Web Audio API 实时合成，不依赖外部音频文件；浏览器首次点击后才解锁，且用户可永久关闭。
- 修复移动端、键盘访问、遮罩关闭、图片上传、历史记录存储溢出、长流式请求超时等问题。
- 对用户/模型文本先 HTML 转义，再应用允许的排版标记，降低前端 XSS 风险。
- 八字和黄历不再展示硬编码的伪造干支/宜忌。
- 新增「法器（模型）选择器」：输入框上方以下拉形式列出可选模型，配真实厂商图标、图文/文字能力标注、节奏与优劣说明；首选默认置顶，其余依序排开；选择记忆于本地，所择模型随请求呈递服务端。

### 后端

- 所有真实 API Key 只从 Cloudflare 环境变量读取，前端源码不含密钥和真实模型代号。
- 浏览器只请求 `/api/chat`，并在请求体携带所选模型 id；服务端据此映射到对应上游单线路直连，不再做跨模型静默兜底。
- 前台选择器只呈现厂商图标与模型代号，不暴露上游网关（Groq / b.ai / 智谱）与真实模型代号。
- 默认首选为通义千问 3.6（走 Groq），速度快且支持图文；其余模型多经 b.ai 聚合网关一个 Key 覆盖，另有智谱 GLM-4.7 直连。
- 推理类模型会先输出 `reasoning_content`，服务端只透传 `content`，思考链不外泄；相应线路生成上限已抬高，避免思考耗尽 token 致正文为空。
- 所选模型不支持读图时，服务端自动剔除图片块，退化为纯文本推演，避免上游拒收。
- 某线路失败时回带 `model_error` 标记的 SSE 帧，前台提示「另择一尊法器」并自动展开选择器，引导问卜者重选。
- 兼容多种上游流式响应结构（`delta.content` 增量与整体 `response` 字段），并对乱码、残留思考标签做清洗与字节级还原。
- 对话记录写入 `CHAT_LOGS` KV，含所选模型 id；后台接口支持 KV 分页扫描、日期筛选和最多 250 条安全加载。
- 新增受后台口令保护的 `/api/health`，只暴露“线路是否配置”，绝不返回密钥。

### 后台

- 后台重做为“观象台”黑金界面，与前台统一视觉语言。
- 显示总记录、今日记录、当前加载访客、各推演线路配置状态。
- 支持日期、最近记录、关键词/IP/地区过滤、分访客折叠、长回答展开。
- `ADMIN_PASSWORD` 必须显式配置，不存在源码默认密码。

## Cloudflare 部署

在 `Workers & Pages → 项目 → Settings → Variables and Secrets` 中至少设置：

```text
B_AI_API_KEY
GROQ_API_KEY
ZHIPU_API_KEY
ADMIN_PASSWORD
```

Workers AI Binding（变量名 `AI`）保留备用，不作问卜推演线路。模型 id 到上游的映射只写在 Pages Function 里，不会下发到浏览器。

## KV

项目使用 `CHAT_LOGS` 保存后台问卜记录。`wrangler.toml` 已沿用原项目的 KV namespace 绑定。如果部署到另一个 Cloudflare 账号，请替换为该账号下新建的 namespace ID。

## 本地开发

```bash
cp .dev.vars.example .dev.vars
# 在 .dev.vars 中填本地测试 Key
npx wrangler pages dev . --ai AI
```

`.dev.vars` 已在 `.gitignore` 中，切勿提交真实密钥。

## 部署

```bash
npx wrangler pages deploy . --project-name=diviner --commit-dirty=true
```

推送 `main` 分支也会触发 Pages 的 Git 集成部署。

## 目录

```text
index.html
styles.css
script.js
admin.html
functions/api/chat.js
functions/api/health.js
functions/api/admin/records.js
wrangler.toml
.dev.vars.example
免费模型配置说明.md
logos/
```

## 使用边界

本项目适合作为传统文化体验、反思和娱乐工具。历法、医疗、法律、金融等高风险事项不要仅依据模型生成内容作决定。
