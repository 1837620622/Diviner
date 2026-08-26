# 玄机子 · 观象授时

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

玄机子是由 **传康KK（万能程序员）** 打造的东方命理顾问。融合子平八字、紫微斗数、易象与西洋星曜塔罗的方法论，以**先排盘、后论象、再给可行趋避**为纲，不作宿命断语。

采用 **Cloudflare Pages + Functions** 单线路架构，前端仅请求同域 `/api/chat`，真实模型与密钥全部在服务端环境变量中，仓库零密钥。

> 天道无常，人心有定。问卜者求心安，解惑者予方向。

---

## 在线体验

| 服务 | 域名 |
|---|---|
| 玄机子 | [diviner.chuankangkk.top](https://diviner.chuankangkk.top) |

---

## 功法

| 域 | 术法 |
|---|---|
| 四柱紫微 | 生辰八字 · 紫微斗数 · 梅花易数 · 六爻 · 奇门遁甲 |
| 观形 | 面相 · 手相 · 风水堪舆（支持图片） |
| 西洋与今法 | 塔罗 · 占星 · 解梦 |
| 时运 | 流年 · 合婚 · 择日 · 起名 |

- 支持图片上传：面相、手相、户型图自动走视觉模型（至多3张，单张建议 <2MB，自动压缩）
- 单线路智能路由：纯文本走 nemotron-3-ultra，图文走 mimo-v2.5，失败自动兜底
- 操作：手机从左边缘右滑打开目录，桌面点击左上目录按钮

---

## 系统架构

```
                互联网
                  │
            Cloudflare 边缘网络
                  │
     ┌────────────┼────────────┐
     │            │            │
  静态资源     Functions     环境变量
 HTML/CSS/JS  /api/chat    API_BASE_URL / API_KEY
                  │
              AI 模型（OpenAI 兼容）
        nemotron-3-ultra（文本）/ mimo-v2.5（视觉）
```

### 卷宗结构

```
玄机子/
├── index.html          # 问卦界面（宋刻本·天文图）
├── styles.css          # 纸纹与版式
├── script.js           # 单线路 + 视觉 + 本地历史
├── admin.html          # 对话管理
├── functions/
│   ├── api/chat.js            # 单线路代理 + 自动路由 + 兜底
│   └── api/admin/records.js   # KV 记录读取
├── wrangler.toml       # KV 绑定
└── .dev.vars.example   # 本地环境变量示例
```

---

## 部署

### 1. 克隆

```bash
git clone https://github.com/1837620622/Diviner.git
cd Diviner
```

### 2. 本地预览

```bash
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入真实值
# API_BASE_URL="https://freeai.chuankangkk.top/v1"
# API_KEY="sk-..."
# ADMIN_PASSWORD="你的后台密码"

npx wrangler pages dev . --kv CHAT_LOGS
```

### 3. 线上部署

```bash
npm install -g wrangler
wrangler login
wrangler pages project create diviner --production-branch main

# 注入密钥（以 Cloudflare Dashboard 或 secret 均可，二选一）
echo "https://freeai.chuankangkk.top/v1" | wrangler pages secret put API_BASE_URL --project-name=diviner
echo "sk-..." | wrangler pages secret put API_KEY --project-name=diviner
echo "你的后台密码" | wrangler pages secret put ADMIN_PASSWORD --project-name=diviner

# 或在 Dashboard > Pages > Settings > Environment variables 中设置
# API_BASE_URL / API_KEY / ADMIN_PASSWORD

wrangler pages deploy . --project-name=diviner
```

> 仓库中不提交任何真实密钥。`.dev.vars` 已在 `.gitignore`。请在 Cloudflare 环境变量中配置。

---

## 安全

| 结界 | 效用 |
|---|---|
| 密钥封印 | 密钥仅存 Cloudflare 环境变量，前端不可见 |
| 同域代理 | 前端仅请求 `/api/chat`，真实上游隐藏 |
| 服务端路由 | 单线路对外无感知，后端自动图文分流与兜底 |
| 开源无忧 | 仓库可公开，不泄露天机 |

---

## 提示词设计

- 分离排盘与解读，先给出推导与校正（真太阳时、节气分月），再断象
- 结构化输出：格局/用神/五行量化/大运流年/验证/行动
- 边界：禁绝对化宿命、封建迷信，末尾必带免责与可验证追问
- 视觉：先观形再取象，不确定处明言

详见 `script.js` 中 `SYSTEM_PROMPT`。

---

## 材料

| 材料 | 用途 |
|---|---|
| AI 模型 | nemotron-3-ultra（文本）/ mimo-v2.5（视觉）/ laguna-s-2.1（兜底） |
| 前端 | HTML5 + CSS3（纸纹版式） + Lucide 图标 |
| 边缘 | Cloudflare Pages + Functions + KV |

---

## 铸器之人

<div align="center">

| | |
|---|---|
| | **传康 kk** |
| 微信 | `1837620622` |
| 邮箱 | `2040168455@qq.com` |
| 闲鱼 / B站 | **万能程序员** |

</div>

---

<div align="center">

```
  命由己造 · 福自我求
  愿星辰指引汝之前路
```

**Powered by 传康 kk**

</div>
