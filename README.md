# 玄机子 · Diviner v8.2

东方问卜交互站点 + Cloudflare Pages Functions 多供应商容灾路由。

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

### 后端

- 所有真实 API Key 只从环境变量读取，项目源码和示例配置中不包含密钥。
- 默认文本路由：`智谱 → Groq → Cloudflare Workers AI → Gemini → HF 公共备用 → 自定义上游`。
- 默认图片路由：`Groq → Gemini → HF 公共备用 → 自定义上游`。
- Groq 默认模型更新为 `qwen/qwen3.6-27b`，支持图文输入。
- 智谱默认免费模型更新为 `glm-4.7-flash`。
- Cloudflare Workers AI 默认使用 `@cf/zai-org/glm-4.7-flash`。
- 修复 Workers AI SSE 与 OpenAI-compatible SSE 格式不同导致的空回复问题；两种流式格式都能解析。
- 上游 429、超时、异常或空线路会自动尝试下一供应商。
- 公共 Hugging Face 免 Key 端点可通过环境变量随时替换 URL/模型或关闭，避免地址退役后必须改源码。
- 对话记录写入 `CHAT_LOGS` KV，后台接口支持 KV 分页扫描、日期筛选和最多 250 条安全加载。
- 新增受后台口令保护的 `/api/health`，只暴露“线路是否配置”，绝不返回密钥。

### 后台

- 后台重做为“观象台”黑金界面，与前台统一视觉语言。
- 显示总记录、今日记录、当前加载访客、各推演线路配置状态。
- 支持日期、最近记录、关键词/IP/地区过滤、分访客折叠、长回答展开。
- `ADMIN_PASSWORD` 必须显式配置，不存在源码默认密码。

## Cloudflare 部署

在 `Workers & Pages → 项目 → Settings → Variables and Secrets` 中至少设置：

```text
GROQ_API_KEY=你的新 Groq Key
ZHIPU_API_KEY=你的新智谱 Key
ADMIN_PASSWORD=你自己设置的后台密码
AI_PROVIDER_ORDER=zhipu,groq,cloudflare,gemini,hfpublic,custom
AI_VISION_PROVIDER_ORDER=groq,gemini,hfpublic,custom
HF_PUBLIC_ENABLED=true
```

可选：

```text
GEMINI_API_KEY=你的 Gemini Key
HF_PUBLIC_BASE_URL=公共端点的新 Base URL
HF_PUBLIC_MODEL=公共端点模型 ID
API_BASE_URL=你的自定义 OpenAI-compatible 上游
API_KEY=你的自定义上游 Key
MODEL_TEXT=自定义文本模型
MODEL_VISION=自定义视觉模型
```

Cloudflare Workers AI：给项目添加 Workers AI Binding，变量名为 `AI`。当前 `wrangler.toml` 也保留 `[ai] binding = "AI"` 供支持该配置的部署方式使用。

## KV

项目使用 `CHAT_LOGS` 保存后台问卜记录。`wrangler.toml` 已沿用原项目的 KV namespace 绑定。如果部署到另一个 Cloudflare 账号，请替换为该账号下新建的 namespace ID。

## 本地开发

```bash
cp .dev.vars.example .dev.vars
# 在 .dev.vars 中填本地测试 Key
npx wrangler pages dev . --ai AI
```

`.dev.vars` 已在 `.gitignore` 中，切勿提交真实密钥。

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
```

## 使用边界

本项目适合作为传统文化体验、反思和娱乐工具。历法、医疗、法律、金融等高风险事项不要仅依据模型生成内容作决定。
