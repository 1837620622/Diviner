# 🔮 玄机子 - AI 智能算命助手

<div align="center">

![AI Badge](https://img.shields.io/badge/AI-玄机子-8E2DE2?style=for-the-badge&logo=magic&logoColor=white)
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

**玄机子** 是由 **传康KK（万能程序员）** 精心训练打造的专属算命 AI 模型。采用 **Cloudflare Pages + Functions** 架构，前后端统一部署，API 密钥安全存储在服务端环境变量中。

### ✨ 核心功能

- 🎒 **生辰八字** - 四柱命理分析
- ⭐ **紫微斗数** - 命盘运势推演  
- 🌸 **梅花易数** - 起卦占卜预测
- 🎴 **六爻占卜** - 铜钱摇卦解读
- 🚪 **奇门遁甲** - 时空择吉分析
- 🏡 **风水堪舆** - 阳宅布局指引
- 🃏 **塔罗占卜** - 牌阵解读指引
- ♈ **西方占星** - 星座运势分析

### 📱 操作方式

- **手机用户**：从屏幕左边缘向右滑动打开玄学宝典，向左滑动关闭
- **电脑用户**：点击左上角 ☰ 按钮打开玄学宝典

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                 Cloudflare Pages                     │
├─────────────────────────────────────────────────────┤
│  前端 (/)           │  后端 (/api/chat)              │
│  - index.html       │  - functions/api/chat.js      │
│  - styles.css       │  - 代理 API 请求               │
│  - script.js        │  - 环境变量存储 API 密钥       │
└─────────────────────────────────────────────────────┘
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

```bash
# 1. 克隆仓库
git clone https://github.com/1837620622/Diviner.git
cd Diviner

# 2. 安装 Wrangler CLI
npm install -g wrangler

# 3. 登录 Cloudflare
wrangler login

# 4. 创建项目
wrangler pages project create diviner --production-branch main

# 5. 配置环境变量（API 密钥）
echo "你的API密钥" | wrangler pages secret put MODELSCOPE_API_KEY --project-name=diviner

# 6. 部署
wrangler pages deploy . --project-name=diviner --branch=main
```

### Windows 版本

```cmd
:: 1. 克隆仓库
git clone https://github.com/1837620622/Diviner.git
cd Diviner

:: 2. 安装 Wrangler CLI
npm install -g wrangler

:: 3. 登录 Cloudflare
wrangler login

:: 4. 创建项目
wrangler pages project create diviner --production-branch main

:: 5. 配置环境变量（API 密钥）
echo 你的API密钥 | wrangler pages secret put MODELSCOPE_API_KEY --project-name=diviner

:: 6. 部署
wrangler pages deploy . --project-name=diviner --branch=main
```

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
| **AI 模型** | 玄机子（传康KK 训练） |
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

**Made with ❤️ by 传康 kk（万能程序员）**

*愿星辰指引你的道路 ✨*

</div>
