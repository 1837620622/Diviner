# 🔮 玄机子 - DeepSeek 算命助手

<div align="center">

![DeepSeek Badge](https://img.shields.io/badge/AI-DeepSeek%20V3.2-8E2DE2?style=for-the-badge&logo=openai&logoColor=white)
![HTML5 Badge](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3 Badge](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript Badge](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Cloudflare Badge](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![License Badge](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br>

**🌌 探索未知 • 洞见未来 • 心灵疗愈 🌌**

<br>

[🚀 在线体验](https://diviner.pages.dev) · [📝 报告问题](https://github.com/1837620622/Diviner/issues) · [💬 联系作者](#-作者信息)

<br>

<img src="https://readme-typing-svg.herokuapp.com?font=Ma+Shan+Zheng&size=30&pause=1000&color=8E2DE2&center=true&vCenter=true&width=500&lines=%E4%B8%87%E7%89%A9%E7%9A%86%E6%9C%89%E6%95%B0%EF%BC%8C%E6%98%9F%E8%BE%B0%E6%8C%87%E8%BF%B7%E6%B4%A5;%E5%91%BD%E8%BF%90%E6%8E%8C%E6%8F%A1%E5%9C%A8%E8%87%AA%E5%B7%B1%E6%89%8B%E4%B8%AD" alt="Typing SVG" />

</div>

---

## 📖 项目简介

**玄机子** 是一款基于 **DeepSeek-V3.2** 强大推理能力打造的 AI 智能命理咨询应用，采用纯前端技术实现，可直接部署到 **Cloudflare Pages** 等静态托管平台。

它不仅仅是一个聊天机器人，更是你的心灵导师。无论你是对未来感到迷茫，还是对情感、事业、财运有具体的困惑，玄机子都能结合传统周易、塔罗与现代心理学，为你提供富有哲理与指引性的解答。

### ✨ 核心亮点

| 特性 | 描述 |
|:---:|:---|
| 🧠 **深度智能** | 接入 ModelScope 平台最新的 DeepSeek-V3.2 模型，拥有超强的语意理解与逻辑推理能力 |
| 🎨 **沉浸体验** | 星空背景动画 + 深色系神秘风格 UI，营造身临其境的占卜氛围 |
| 🧙‍♂️ **人格化身** | 内置"玄机子"大师人设，半文半白的古风回复，充满智慧与温情 |
| ⚡️ **即开即用** | 纯前端实现，无需后端服务器，部署简单，响应迅速 |
| 📱 **响应式设计** | 完美适配桌面端和移动端，随时随地获取命运指引 |
| 🔐 **隐私安全** | API 密钥仅存储在本地浏览器，不经过任何第三方服务器 |

---

## 🚀 快速开始

### 方式一：在线体验

直接访问部署好的网站：**[https://diviner.pages.dev](https://diviner.pages.dev)**

### 方式二：本地运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/1837620622/Diviner.git
   cd Diviner
   ```

2. **启动本地服务器**
   ```bash
   # 使用 Python
   python -m http.server 8080
   
   # 或使用 Node.js
   npx serve .
   ```

3. **打开浏览器访问** `http://localhost:8080`

4. **输入 API 密钥**
   - 访问 [ModelScope 官网](https://www.modelscope.cn) 获取 API Token
   - 在页面顶部输入框中粘贴你的 API Key

---

## ☁️ Cloudflare Pages 部署指南

### Mac 版本部署步骤

#### 步骤 1：准备工作
1. Fork 本仓库到你的 GitHub 账号
2. 获取 ModelScope API Token：访问 [ModelScope 官网](https://www.modelscope.cn) 注册并获取 API 密钥

#### 步骤 2：连接 Cloudflare Pages
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application** → **Pages**
3. 选择 **Connect to Git** → 授权 GitHub → 选择 Fork 的仓库

#### 步骤 3：配置构建设置
| 配置项 | 值 |
|:---|:---|
| Production branch | `main` |
| Build command | *(留空)* |
| Build output directory | `/` |

#### 步骤 4：⚠️ 配置环境变量（必须！）
在部署页面添加环境变量：

| 变量名 | 值 |
|:---|:---|
| `MODELSCOPE_API_KEY` | 你的 ModelScope API Token |

#### 步骤 5：配置自定义域名（可选）
1. 部署完成后，进入项目 **Settings** → **Custom domains**
2. 添加自定义域名（如 `diviner.chuankangkk.top`）
3. 在域名 DNS 设置中添加 CNAME 记录指向 Cloudflare 提供的地址

#### 步骤 6：部署
点击 **Save and Deploy**，等待部署完成！

---

### Windows 版本部署步骤

#### 步骤 1：准备工作
1. Fork 本仓库到你的 GitHub 账号
2. 获取 ModelScope API Token：访问 [ModelScope 官网](https://www.modelscope.cn) 注册并获取 API 密钥

#### 步骤 2：连接 Cloudflare Pages
1. 打开浏览器访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application** → **Pages**
3. 选择 **Connect to Git** → 授权 GitHub → 选择 Fork 的仓库

#### 步骤 3：配置构建设置
| 配置项 | 值 |
|:---|:---|
| Production branch | `main` |
| Build command | *(留空)* |
| Build output directory | `/` |

#### 步骤 4：⚠️ 配置环境变量（必须！）
在部署页面添加环境变量：

| 变量名 | 值 |
|:---|:---|
| `MODELSCOPE_API_KEY` | 你的 ModelScope API Token |

#### 步骤 5：配置自定义域名（可选）
1. 部署完成后，进入项目 **Settings** → **Custom domains**
2. 添加自定义域名（如 `diviner.chuankangkk.top`）
3. 在域名 DNS 设置中添加 CNAME 记录指向 Cloudflare 提供的地址

#### 步骤 6：部署
点击 **Save and Deploy**，等待部署完成！

---

### 🔐 安全说明
- API 密钥已从前端代码中完全移除
- 所有 API 请求通过 Cloudflare Functions 代理
- 密钥安全存储在 Cloudflare 环境变量中
- 前端代码可安全公开，不会泄露密钥

### 📝 更新环境变量
如需更新 API 密钥：**Pages 项目** → **Settings** → **Environment variables** → 修改 `MODELSCOPE_API_KEY`

---

## 🛠️ 技术栈

<div align="center">

| 类别 | 技术 |
|:---:|:---:|
| **AI 模型** | [DeepSeek-V3.2](https://www.modelscope.cn/models/deepseek-ai/DeepSeek-V3.2) via ModelScope API |
| **前端** | HTML5 + CSS3 + Vanilla JavaScript |
| **动画** | CSS Keyframes + SVG |
| **字体** | Google Fonts (Noto Serif SC, Ma Shan Zheng) |
| **部署** | Cloudflare Pages |

</div>

---

## 📁 项目结构

```
Diviner/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── script.js       # 交互逻辑与 API 调用
├── README.md       # 项目说明
└── .gitignore      # Git 忽略配置
```

---

## 🤝 贡献指南

欢迎各位缘主提交 Issue 或 Pull Request 来完善这个项目！

1. Fork 本仓库
2. 创建新的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📜 开源协议

本项目采用 [MIT 协议](LICENSE) 开源，可自由使用和修改。

---

## 📬 作者信息

<div align="center">

| | |
|:---:|:---|
| 👨‍💻 | **传康 kk** |
| 📱 | 微信: `1837620622` |
| 📧 | 邮箱: `2040168455@qq.com` |
| 🐟 | 闲鱼 / B站: **万能程序员** |
| 🔗 | [GitHub 主页](https://github.com/1837620622) |

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12&height=100&section=footer" width="100%"/>

**Made with ❤️ by 传康 kk**

*愿星辰指引你的道路 ✨*

</div>
