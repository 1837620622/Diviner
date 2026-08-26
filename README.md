# 玄机子 · 观象授时 (XuanJiZi)

<div align="center">

```
      观  ·  象  ·  授  ·  时
    ┌───────────────────────┐
    │   玄  机  子            │
    │   先算后断 · 有界有度    │
    └───────────────────────┘
```

![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-OpenAI_Compatible-black?style=for-the-badge)

**把推算还给推算，把选择还给人**

[在线体验](https://diviner.chuankangkk.top) · [反馈建议](https://github.com/1837620622/Diviner/issues)

</div>

---

## 何为玄机子

玄机子是由 **传康KK（万能程序员）** 打造的东方命理与现代数理推演智能体。融合子平八字、紫微斗数、梅花六爻、易经卦象与西洋灵犀塔罗的方法论，以**先排盘、后论象、再给可行趋避**为纲，不作绝对化宿命断语。

采用 **Cloudflare Pages + Functions** 极简单线路架构，前端仅请求同域 `/api/chat`，真实大模型与密钥全部由服务端环境变量注入，**仓库零密钥暴露**。

> 天道无常，人心有定。问卜者求心安，解惑者予方向。

---

## 核心法器与功能

| 法器 | 功法特性 |
|---|---|
| **周易六爻** | 互动 3D 乾隆通宝铜钱掷卦（掷六次成卦），自动纳甲成卦（本卦与变卦）、排爻位动爻并一键解卦 |
| **灵犀塔罗** | 22 张大阿卡纳牌阵，支持【过去·现在·未来】圣三角牌阵，3D 翻牌动画，正逆位深度象意 |
| **四柱八字** | 公历/农历智能排盘，结合出生城市计算**真太阳时**，排定四柱干支、十神、地支藏干与五行气数 |
| **观象灵签** | 每日一签抽签仪式，摇动签筒出签，附带四言古诗、卦名与吉凶详解，一键让玄机子详批 |
| **观形堪舆** | 支持多模态图片上传（面相、手相、房宅户型图），自动走多模态视觉模型，光线与纹路智能分析 |
| **空灵禅音** | Web Audio API 纯原生合成空灵磬音（432Hz 颂钵）、悠远古刹铜钟与铜钱声，零外部音频资源 |
| **命理符笺** | 高清 Canvas 运势海报与符笺生成器，支持一键下载保存到相册或复制解读分享 |
| **近问档案** | 本地多轮对话归档，支持关键词检索、历史恢复与安全清理 |

---

## 系统架构与安全机制

```
                互联网
                  │
            Cloudflare 边缘网络
                  │
     ┌────────────┼────────────┐
     │            │            │
  静态前端     Functions     环境变量 (Cloudflare Dashboard / Wrangler Secret)
 HTML/CSS/JS  /api/chat    API_BASE_URL / API_KEY / MODEL_TEXT / MODEL_VISION
                  │
               AI 大模型（OpenAI 兼容协议）
        nemotron-3-ultra / mimo-v2.5 / deepseek / gpt-4o-mini
```

### 安全承诺
1. **仓库零密钥**：代码库中不包含任何真实 API Key 或敏感密码。`.env*` 和 `.dev.vars*` 均已加入 `.gitignore`。
2. **同域代理**：前端仅调用同域的 `/api/chat`，屏蔽真实上游地址与鉴权请求头。
3. **多重智能兜底**：后端具备主模型及多级 Candidate 模型自动故障转移（Fallback），超时自适应调整，异常时温润兜底。

---

## 卷宗结构

```
玄机子/
├── index.html               # 问卦主界面（赛博星图与宣纸台）
├── styles.css               # 东方玄学与星图版式（全端自适应）
├── script.js                # 互动法器（六爻/塔罗/八字/摇签）+ 禅音 + 绘图
├── admin.html               # 对话管理后台
├── functions/
│   ├── api/chat.js          # 单线路代理 + 自动路由 + 多重兜底
│   └── api/admin/records.js # KV 记录安全读取
├── wrangler.toml            # Cloudflare Pages & KV 绑定
└── .dev.vars.example        # 本地开发环境变量示例
```

---

## 部署指引

### 1. 本地运行

```bash
git clone https://github.com/1837620622/Diviner.git
cd Diviner

cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入自己的 OpenAI/中转 API 密钥与后台密码
# API_BASE_URL="https://freeai.chuankangkk.top/v1"
# API_KEY="sk-..."
# ADMIN_PASSWORD="你的后台管理密码"

npx wrangler pages dev . --kv CHAT_LOGS
```

### 2. 线上部署 (Cloudflare Pages)

1. 推送代码至 GitHub 仓库；
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages** > **Pages** > 连接 GitHub 仓库；
3. 构建输出目录填写：`.`；
4. 在 **Settings** > **Environment variables** 中添加以下环境变量：
   - `API_BASE_URL`：例如 `https://freeai.chuankangkk.top/v1` 或 `https://api.openai.com/v1`
   - `API_KEY`：你的 API 密钥（以 `sk-` 开头）
   - `ADMIN_PASSWORD`：后台管理密码
   - `MODEL_TEXT`（可选）：自定义主文本模型
   - `MODEL_VISION`（可选）：自定义多模态模型
5. 绑定 KV 命名空间 `CHAT_LOGS`（可选，用于存储问对记录）。

---

## 铸器之人

<div align="center">

| | |
|---|---|
| 开发者 | **传康 kk** |
| 微信 | `1837620622` |
| 邮箱 | `2040168455@qq.com` |
| 闲鱼 / B站 | **万能程序员** |

```
  命由己造 · 福自我求
  愿星辰指引汝之前路
```

**Powered by 传康 kk**

</div>

