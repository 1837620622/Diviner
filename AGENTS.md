# 玄机子 · Diviner

东方问卜站点。静态前端 + Cloudflare Pages Functions。问卜请求只打本站 `/api/chat`，由边缘函数在服务端做线路容灾。密钥、模型代号、供应商名称不出现在前端源码和浏览器响应头里。

## 真实目录

工程根：`/Volumes/256G/Diviner`

```text
index.html                 问卜前台
styles.css
script.js                  只请求 /api/chat，不含任何 Key 或模型 ID
admin.html                 观象台后台（口令走请求头，不写进源码）
zan.jpg                    赞赏码图片
_headers
wrangler.toml              仅 KV / AI binding，无密钥
functions/api/chat.js      服务端路由：Workers AI → Groq → 智谱 GLM-4.7-flash
functions/api/health.js    后台口令校验后只返回「是否已配置」
functions/api/admin/records.js
.dev.vars.example          本地空模板，禁止填真实值后提交
```

GitHub：`1837620622/Diviner`  
生产：`https://diviner.chuankangkk.top/`  
Pages：`diviner` 项目，`diviner.pages.dev`

## 数据来源

- 问卜对话：浏览器 `POST /api/chat`，SSE 流式返回。
- 密钥：只存在 Cloudflare Pages → Settings → Variables and Secrets。
- 问卜档案：KV `CHAT_LOGS`（binding 名必须是 `CHAT_LOGS`）。
- Workers AI：`wrangler.toml` 的 `[ai] binding = "AI"`。

前端 `script.js` 里的 `SYSTEM_PROMPT` 只是给模型看的人设，不含上游地址和模型代号。

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
2. 浏览器 Network：`/api/chat` 的请求体不含 Key；响应头不含 `X-Diviner-Route` / 模型字符串。
3. 后台：`/admin.html` 用 `ADMIN_PASSWORD` 登录。线路只显示「灵台甲/乙/丙」是否点亮，记录标签统一为「灵台」。
4. 桌面：顶栏左侧按钮可收合侧栏；聊天区可滚动欢迎页与长回复。
5. 手机 390 宽：标题不被顶栏裁切，输入框占位词完整，侧栏汉堡可开合，轮盘「玄」居中。

## 打包 / 发布

- 静态站点，无 npm 构建。
- GitHub 提交身份：`传康Kk <1837620622@qq.com>`。
- 发布前扫描：源码、README、示例文件不得出现真实 Key、个人推理域名、`sk-` / `gsk_` 字面量。
- Cloudflare 必须已配置（名称需一致，大小写敏感）：

```text
ZHIPU_API_KEY
GROQ_API_KEY
ADMIN_PASSWORD
```

Workers AI Binding 名称：`AI`。

可选覆盖（不要也可以）：`GROQ_MODEL`、`ZHIPU_MODEL`、`CF_AI_MODELS`、`CF_AI_VISION_MODELS`。未配置时函数内使用内置顺序，且不会把这些字符串返回给浏览器。

## 服务端路由（对用户不可见）

文本默认顺序：

1. Cloudflare Workers AI（先试账号内较强中文模型，额度/429/超时则换下一颗，全部失败再出站）
2. Groq
3. 智谱 `glm-4.7-flash`

图片默认：Workers AI 多模态 → Groq。

失败对用户只表现为「推演稍滞」，不出现供应商、模型 ID、状态码。

心流、魔搭、HuggingFace 公共端点、Gemini、自定义上游已从默认路由移除，避免旧项目下架模型拖垮容灾。

## 前端约定

- 只允许 `fetch('/api/chat')`。禁止在浏览器里拼第三方 API Host。
- 流式正文经过乱码修复：去掉思考标签、尝试把 UTF-8 被当成 Latin-1 的字节还原、去掉替换字符。
- 回复结构按四段小标题渲染：象数解析 / 吉凶趋避 / 可行建议 / 玄机箴言。

## 已知风险

- Workers AI 部分大模型需要付费档；免费额度用尽会自动落到 Groq / 智谱。
- 智谱与 Groq 的默认模型名写在 Functions 里，不写进前端。若厂商改名，只改 `functions/api/chat.js` 或云端环境变量。
- 八字/黄历不做前端伪造排盘；模型若乱编干支，提示词要求其标明不确定。
- KV 中历史记录若仍含旧版模型字段，后台展示已强制改为「灵台」，不再读 `model` 字段。
- 本项目是文化体验与自省工具，不能替代医疗、法律、投资判断。
