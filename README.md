# 玄机子 · Diviner v6

东方命理问卜前端 + Cloudflare Pages Functions 多模型容灾路由。

## v6 主要更新

- 前端重做为“东方占卜 / 宣纸 / 朱砂 / 金线”视觉体系，弱化通用聊天软件感。
- 首页增加八卦仪式视觉、法门入口、问卜提示、移动端底部弹窗布局。
- 修复快捷入口重复触发、弹窗 Esc/遮罩关闭、图片上传异常、请求长时间卡死、历史图片挤爆 localStorage 等问题。
- 八字前端不再显示固定伪造四柱；先核对出生资料，再交由推演模型按节气、换日、真太阳时规则排盘。
- 今日黄历不再展示固定的“干支/宜忌”模板，而是把当前具体日期交给模型重新推演。
- 模型路由升级为 Groq / 智谱 / Cloudflare Workers AI / Hugging Face 免 Key 公共 Qwen / Gemini / 自定义线路自动故障转移。
- 后端不会把真实 API Key 下发给浏览器。

## 推荐部署配置

Cloudflare Pages → Settings → Variables and Secrets：

```text
GROQ_API_KEY=你的 Groq Key
ZHIPU_API_KEY=你的智谱 Key
ADMIN_PASSWORD=你自己的后台密码
AI_BALANCE_MODE=priority
AI_PROVIDER_ORDER=groq,zhipu,cloudflare,hfpublic,gemini,custom
HF_PUBLIC_ENABLED=true
```

如需 Gemini，再增加：

```text
GEMINI_API_KEY=你的 Gemini Key
```

同时建议在 Pages → Settings → Bindings 添加 Workers AI Binding：

```text
Variable name: AI
```

完整说明见 `免费模型配置说明.md`。

## 模型策略

稳定线路优先，公共免 Key 线路只作兜底。当前代码内置的 Hugging Face Qwen3.8-Flash-Next 公共端点无需账号或 API Key，但它是共享临时服务，存在限流和退役风险；可随时通过 `HF_PUBLIC_ENABLED=false` 关闭。

## 本地开发

```bash
cp .dev.vars.example .dev.vars
npx wrangler pages dev . --ai AI
```

`.dev.vars` 不要提交到 Git。

## 目录

```text
index.html
styles.css
script.js
admin.html
functions/api/chat.js
functions/api/admin/records.js
wrangler.toml
.dev.vars.example
免费模型配置说明.md
```

## 使用边界

占卜输出适合作为传统文化体验、反思与决策整理工具，不替代医疗、法律、金融等专业意见。涉及历法精确计算时，不应以固定模板冒充真实排盘。
