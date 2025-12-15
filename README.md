# 🔮 玄机子 - DeepSeek 算命助手

<div align="center">

![DeepSeek Badge](https://img.shields.io/badge/AI-DeepSeek%20V3.2-8E2DE2?style=for-the-badge&logo=openai&logoColor=white)
![Cloudflare Badge](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![License Badge](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**🌌 探索未知 • 洞见未来 • 心灵疗愈 🌌**

[🚀 在线体验](https://diviner.chuankangkk.top) · [📝 报告问题](https://github.com/1837620622/Diviner/issues)

</div>

---

## 🌐 在线演示

| 服务 | 域名 |
|:---|:---|
| **玄机子** | [diviner.chuankangkk.top](https://diviner.chuankangkk.top) |

---

## 📖 项目简介

**玄机子** 是基于 **DeepSeek-V3.2** 打造的 AI 智能命理咨询应用。采用 **Cloudflare Pages + Functions** 架构，前后端统一部署，API 密钥安全存储在服务端环境变量中。

### ✨ 核心功能

- 🎒 **生辰八字** - 四柱命理分析
- ⭐ **紫微斗数** - 命盘运势推演  
- 🌸 **梅花易数** - 起卦占卜预测
- 🎴 **六爻占卜** - 铜钱摇卦解读
- 🚪 **奇门遁甲** - 时空择吉分析
- 🏡 **风水堪舆** - 阳宅布局指引
- 🃏 **塔罗占卜** - 牌阵解读指引
- ♈ **西方占星** - 星座运势分析

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                 Cloudflare Pages                     │
├─────────────────────────────────────────────────────┤
│  前端 (/)           │  后端 (/api/chat)              │
│  - index.html       │  - functions/api/chat.js      │
│  - styles.css       │  - 代理 ModelScope API        │
│  - script.js        │  - 环境变量存储 API 密钥       │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   ModelScope API        │
              │   DeepSeek-V3.2 模型    │
              └─────────────────────────┘
```

### 📁 项目结构

```
Diviner/
├── index.html              # 前端主页面
├── styles.css              # 样式文件
├── script.js               # 前端交互逻辑
├── functions/              # Cloudflare Functions（后端）
│   └── api/
│       └── chat.js         # API 代理（密钥安全存储）
├── README.md               # 项目说明
└── .gitignore              # Git 忽略配置
```

---

## ☁️ Cloudflare Pages 部署指南

### Mac 版本

#### 1. 克隆仓库
```bash
git clone https://github.com/1837620622/Diviner.git
cd Diviner
```

#### 2. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

#### 3. 登录 Cloudflare
```bash
wrangler login
```

#### 4. 创建项目
```bash
wrangler pages project create diviner --production-branch main
```

#### 5. 配置环境变量（API 密钥）
```bash
echo "你的ModelScope API密钥" | wrangler pages secret put MODELSCOPE_API_KEY --project-name=diviner
```

#### 6. 部署
```bash
wrangler pages deploy . --project-name=diviner --branch=main
```

#### 7. 配置自定义域名
访问 [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → diviner → Settings → Custom domains

---

### Windows 版本

#### 1. 克隆仓库
```cmd
git clone https://github.com/1837620622/Diviner.git
cd Diviner
```

#### 2. 安装 Wrangler CLI
```cmd
npm install -g wrangler
```

#### 3. 登录 Cloudflare
```cmd
wrangler login
```

#### 4. 创建项目
```cmd
wrangler pages project create diviner --production-branch main
```

#### 5. 配置环境变量（API 密钥）
```cmd
echo 你的ModelScope API密钥 | wrangler pages secret put MODELSCOPE_API_KEY --project-name=diviner
```

#### 6. 部署
```cmd
wrangler pages deploy . --project-name=diviner --branch=main
```

#### 7. 配置自定义域名
访问 [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → diviner → Settings → Custom domains

---

## 🔐 安全说明

| 特性 | 说明 |
|:---|:---|
| ✅ API 密钥安全 | 存储在 Cloudflare 环境变量，前端代码无密钥 |
| ✅ 后端代理 | 所有 API 请求通过 `/api/chat` 服务端代理 |
| ✅ 代码公开安全 | 前端代码可安全开源，不会泄露任何敏感信息 |

---

## 🛠️ 技术栈

| 类别 | 技术 |
|:---:|:---|
| **AI 模型** | DeepSeek-V3.2 via ModelScope API |
| **前端** | HTML5 + CSS3 + JavaScript |
| **后端** | Cloudflare Pages Functions |
| **部署** | Cloudflare Pages |
| **域名** | diviner.chuankangkk.top |

---

## 📬 作者信息

| | |
|:---:|:---|
| 👨‍💻 | **传康 kk** |
| 📱 | Vx: `1837620622` |
| 📧 | 邮箱: `2040168455@qq.com` |
| 🐟 | 闲鱼 / B站: **万能程序员** |

---

<div align="center">

**Made with ❤️ by 传康 kk**

*愿星辰指引你的道路 ✨*

</div>
