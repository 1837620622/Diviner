# 玄机子 · Diviner

东方问卜站点。静态前端 + Cloudflare Pages Functions。问卜者在前台「法器（模型）选择器」中自主择选推演模型，所选模型 id 随请求体呈递服务端，由边缘函数映射到对应上游单线路直连。密钥、上游网关名称不出现在前端源码和浏览器响应头里；前台只见厂商图标与模型代号。

## 真实目录

工程根：`/Volumes/256G/Diviner`

```text
index.html                 问卜前台（含法器选择器 markup）
styles.css                 低饱和黑金 / 朱砂印 / 东方术数主题
script.js                  只请求 /api/chat；MODEL_CATALOG 定义法器；不含任何 Key
admin.html                 观象台后台（口令走请求头，不写进源码）
zan.jpg                    赞赏码图片
_headers
wrangler.toml              仅 KV / AI binding，无密钥
logos/                     真实厂商 logo（deepseek/qwen/zhipu/tencent/xiaomi）
functions/api/chat.js      服务端路由表：model id → 上游单线路直连
functions/api/health.js    后台口令校验后只返回「是否已配置」
functions/api/admin/records.js
.dev.vars.example          本地空模板，禁止填真实值后提交
```

GitHub：`1837620622/Diviner`
生产：`https://diviner.chuankangkk.top/`
Pages：`diviner` 项目，`diviner.pages.dev`

## 数据来源

- 问卜对话：浏览器 `POST /api/chat`，SSE 流式返回；请求体携带所选 `model` id。
- 密钥：只存在 Cloudflare Pages → Settings → Variables and Secrets。
- 问卜档案：KV `CHAT_LOGS`（binding 名必须是 `CHAT_LOGS`），记录含所选模型 id。
- Workers AI：`wrangler.toml` 的 `[ai] binding = "AI"`。

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

1. 前台：打开 `https://diviner.chuankangkk.top/`，发一句「以一句箴言回复：通达」。应看到流式中文，响应头不得出现模型 ID。
2. 法器选择器：输入框上方下拉列出 8 尊法器，默认首选置顶；带厂商 logo、图文/文字徽标、节奏与优劣；切换后记忆于 localStorage。
3. 浏览器 Network：`/api/chat` 请求体只含所选模型 id，不含 Key；响应头不含上游网关 / 真实模型代号。
4. 换一尊不支持读图的法器并附图：图片被服务端剔除，退化为纯文本推演，不报上游拒收。
5. 某线路失败：前台收到 `model_error` SSE 帧，提示「另择一尊法器」并自动展开选择器。
6. 后台：`/admin.html` 用 `ADMIN_PASSWORD` 登录。线路只显示是否点亮，不暴露上游。
7. 手机 390 宽：法器面板全宽展开不溢出，标题不被顶栏裁切。

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

可选覆盖（不要也可以）：`GROQ_MODEL`、`ZHIPU_MODEL`。未配置时函数内使用内置默认值，且不会把这些字符串返回给浏览器。

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
- 回复结构按四段小标题渲染：象数解析 / 吉凶趋避 / 可行建议 / 玄机箴言。

## 已知风险

- b.ai 免费档存在上游速率限制，拥挤时该线路可能回 `model_error`，前台引导另择法器。
- 智谱与 Groq 的默认模型名写在 Functions 里，不写进前端。若厂商改名，只改 `functions/api/chat.js` 或云端环境变量。
- 八字/黄历不做前端伪造排盘；模型若乱编干支，提示词要求其标明不确定。
- KV 中历史记录含所选模型 id，后台可按模型筛选。
- 本项目是文化体验与自省工具，不能替代医疗、法律、投资判断。
