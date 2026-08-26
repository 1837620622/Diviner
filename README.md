# 玄机子 · 观象授时 (XuanJiZi v3.2)

<div align="center">

```
      观  ·  象  ·  授  ·  时
    ┌───────────────────────┐
    │   玄  机  子            │
    │   先算后断 · 有界有度    │
    └───────────────────────┘
```

![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Zero Emoji](https://img.shields.io/badge/Design-100%25_Zero_Emoji-8e2de2?style=for-the-badge)
![Web Audio](https://img.shields.io/badge/Sound-Web_Audio_Synth-d4af37?style=for-the-badge)

**把推算还给数理，把选择还给人**

[在线体验](https://diviner.chuankangkk.top) · [问题反馈](https://github.com/1837620622/Diviner/issues)

</div>

---

## 概述与设计理念

玄机子是由 **传康KK（万能程序员）** 打造的东方命理数术与现代数理推演智能体。熔铸子平八字、紫微斗数、梅花易数、周易六爻纳甲、小六壬掌诀、风水堪舆、灵犀塔罗原型与周公解梦之精要。

以 **“先排盘、后观象、再给可行趋避”** 为宗，不作绝对化宿命妄断。全站恪守 **100% 零 Emoji 经卷排版规范**，全面采用宋刻经卷版式、古典矢量 SVG 与 Lucide 图标。

---

## 核心法器与数理引擎

| 法器 | 数理功法与交互特性 |
|---|---|
| **梅花易数** | 支持【时辰起卦】与【报数起卦】，精确推导上卦、下卦、动爻，排定本卦、互卦、变卦，并推演体用五行生克吉凶走向 |
| **小六壬掌中诀** | 还原大安、留连、速喜、赤口、小吉、空亡六神掐指轮转动画，结合五行落宫方位与神煞断语迅速断事 |
| **功德电子木鱼** | 基于 Web Audio API 纯算法合成空灵实木敲击声，伴随金光灵气浮动（功德+1、静心+1、杂念-1），支持发愿回向 |
| **今日黄历万年历** | 择吉万年历，实时展示公历农历对齐、当日干支日柱、神煞宜忌、冲煞属相与吉利方位 |
| **周公解梦典籍** | 分类归纳天象、地理、神鬼、身体、动物等核心梦境意象，融合古典解梦与荣格原型心理学深度剖析 |
| **周易六爻纳甲** | 3D 乾隆通宝物理掷卦（掷六次成卦），精准判定老阳（动）、老阴（动）、少阳、少阴，识别本卦与变卦纳甲爻象 |
| **灵犀塔罗** | 22 张大阿卡纳牌阵，支持【过去·现在·未来】圣三角牌阵与 3D 翻牌动画，融合正逆位深层隐喻与行动指引 |
| **四柱八字排盘** | 公历生日结合出生地经度换算**真太阳时**，排定年月日时四柱干支、十神透藏、地支藏干与动态五行能量雷达条 |
| **观象灵签** | 每日一签抽签仪式，3D 签筒摇动出签，附带四言古诗、卦名与吉凶详解，一键让玄机子详批 |
| **观形堪舆** | 支持面相、手相、房宅户型图多模态视觉上传，光线、纹理与门窗朝向客观观形后以象取意 |
| **高清符笺海报** | Canvas 2D 宣纸古风海报生成器，内置朱砂印章与金丝边框，支持一键下载保存到手机相册或分享 |
| **近问档案归档** | 本地多轮对话归档，支持搜索过滤、历史还原与安全清除 |

---

## 纯代码合成声音系统 (Web Audio API)

全站无需加载任何外部 MP3/WAV 音频文件，通过 Web Audio API 纯代码实时合成：
- **432Hz 颂钵磬声**：纯正弦基频叠加 864Hz、1296Hz 泛音列，空灵舒缓。
- **铜钱清脆落地声**：三角波高频脉冲与随机微频调制，还原铜钱碰撞质感。
- **古刹铜钟声**：216Hz 低频长余音，钟声悠远。
- **实木木鱼声**：580Hz 快速衰减频降三角振荡，还原真实红木木鱼叩击。

---

## 系统架构与安全隐私

```
                客户端 (PC / 平板 / 手机)
                           │
             Cloudflare 全球边缘加速网络
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
   静态资源托管                          Edge Functions
 (index.html / CSS / JS)                  /api/chat
                                             │
                          ┌──────────────────┴──────────────────┐
                          │ 1. 严格隐藏上游服务商与模型名称           │
                          │ 2. 统一输出 model: "xuanjizi-diviner"│
                          │ 3. 环境变量注入 API_KEY (代码零泄露)     │
                          │ 4. 多候选线路 12s 快速超时故障转移       │
                          │ 5. 优雅温润的命理兜底机制                │
                          └──────────────────┬──────────────────┘
                                             │
                                     AI 大模型推理通道
```

### 安全与隐私承诺
1. **公开仓库零密钥**：代码库中绝不包含任何 API Key 或敏感密码。`.env*` 和 `.dev.vars*` 均已列入 `.gitignore`。
2. **上游模型完全隐藏**：API 响应中剥离上游真实模型标识，对外统称玄机子专属引擎（`xuanjizi-diviner`），防止厂商信息泄露。
3. **同域中转代理**：前端仅与同域 `/api/chat` 通信，不直接暴露外部 API 接口。

---

## 部署教程

### 常见疑问：为什么 GitHub Push 后 Cloudflare 没有自动部署？
如果你的 Cloudflare Pages 尚未关联 GitHub 仓库，单纯向 GitHub 推送代码不会触发 Cloudflare 构建。你可以选择以下两种部署方式之一：

---

### 方案一：在 Cloudflare Dashboard 中关联 GitHub（推荐，实现自动持续部署）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 依次点击 **Workers 和 Pages** -> **创建** -> 选择 **Pages** 标签页 -> 点击 **连接到 Git**。
3. 授权并选择你的 GitHub 仓库 `Diviner`。
4. 在构建配置页面：
   - **项目名称**：`diviner`（或自定义名称）
   - **生产分支**：`main`
   - **框架预设**：选择 `无`（None）
   - **构建命令**：**留空**
   - **构建输出目录**：填写 `/`（根目录）
5. 在下方 **环境变量** 中添加：
   - `API_KEY`：你的大模型 API 密钥（如中转 API 密钥）
   - `API_BASE_URL`：`https://freeai.chuankangkk.top/v1`（或官方 OpenAI 地址）
   - `MODEL_TEXT`：`nemotron-3-ultra-free`（或 `deepseek-chat` / `gpt-4o-mini`）
   - `MODEL_VISION`：`mimo-v2.5-free`（或 `gpt-4o-mini`）
6. 点击 **保存并部署**。后续每次 `git push` 到 `main` 分支，Cloudflare 都会自动完成秒级更新部署。

---

### 方案二：使用 Wrangler CLI 命令行秒级直推（无需关联 Git）

在项目本地根目录下执行：

```bash
# 1. 安装 Wrangler（若未安装）
npm install -g wrangler

# 2. 登录 Cloudflare
npx wrangler login

# 3. 直接部署当前目录至 Cloudflare Pages
npx wrangler pages deploy . --project-name diviner
```

---

## 环境变量速查表

| 变量名 | 说明 | 示例值 |
|---|---|---|
| `API_KEY` | **必填**。OpenAI 兼容接口密钥 | `sk-xxxxxxxxx` |
| `API_BASE_URL` | **选填**。接口地址（默认官方地址） | `https://freeai.chuankangkk.top/v1` |
| `MODEL_TEXT` | **选填**。文本推演主模型名称 | `nemotron-3-ultra-free` / `deepseek-chat` |
| `MODEL_VISION` | **选填**。图片视觉观形模型名称 | `mimo-v2.5-free` / `gpt-4o-mini` |
| `ADMIN_PASSWORD` | **选填**。管理后台访问口令 | `your_secret_password` |

---

## 本地开发调试

```bash
# 克隆仓库
git clone https://github.com/1837620622/Diviner.git
cd Diviner

# 配置本地环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入你的 API_KEY

# 启动本地模拟环境
npx wrangler pages dev .
```

打开浏览器访问 `http://localhost:8788` 即可开始调试。

---

## 卷宗目录结构

```
Diviner/
├── index.html               # 问卦主界面（赛博星图与宣纸台，全响应式）
├── styles.css               # 东方美学版式（九大法器样式与跨端适配）
├── script.js                # 互动法器引擎 + Web Audio 禅音 + Canvas 海报
├── admin.html               # 对话管理后台
├── functions/
│   ├── api/chat.js          # 单线路代理 + 自动脱敏 + 多候选快速容灾
│   └── api/admin/records.js # KV 记录安全读取与分页
├── wrangler.toml            # Cloudflare Pages 配置文件
├── .dev.vars.example        # 本地开发环境变量示例
├── .gitignore               # 忽略敏感环境文件与日志
└── README.md                # 完整技术与部署说明文档
```

---

## 免责声明与致谢

- **免责声明**：玄机子所提供之卦象、命盘、占星与解梦推演均基于传统文化符号数理归纳与数理逻辑，仅供文化交流与娱乐参考，不构成专业医疗、法律或金融投资决策建议。行则将至，事在人为。
- **致谢**：由 **传康KK（万能程序员）** 炼制。
