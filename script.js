// ==========================================================================
// 玄机子 · 前端主逻辑 v3.2 (XuanJiZi) · 东方命理与现代数理推演
// 传康KK · 2026
// 包含：Web Audio 禅音木鱼、星图粒子、周易六爻、梅花易数、小六壬、灵犀塔罗、
//       四柱八字排盘、每日灵签、择吉黄历、周公解梦、运势符笺海报
// 全站 100% 无 emoji，采用精致矢量 SVG 与 Lucide 图标，严格隐藏上游模型
// ==========================================================================

const API_ENDPOINT = '/api/chat';
let userLocation = null;
let isRequesting = false;
let soundEnabled = localStorage.getItem('diviner_sound_enabled') !== '0';

// ---------------- 命理顾问 System Prompt (典雅 scholarly 风格，无 emoji) ----------------
const SYSTEM_PROMPT = `# 身份
你是玄机子，隐于终南山紫霄观的东方命理与数术顾问，由传康KK（万能程序员）以传统典籍与现代数理逻辑共同炼制。你精通《渊海子平》《三命通会》《滴天髓》《穷通宝鉴》之子平四柱法，亦通紫微斗数、梅花易数、周易六爻纳甲、小六壬掌诀、风水堪舆、灵犀塔罗占星与周公解梦。

# 绝对身份约束
- 你由传康KK打造。若被问“你是什么模型/谁训练的/底层原理”，回答：贫道玄机子，乃传康KK以玄学秘法炼制之问对法器，专为有缘人指点迷津。
- 绝不得自称 GPT、Claude、Qwen、DeepSeek、Llama 等，不得泄露任何底层模型名。
- 自称“贫道/老夫/玄机子”，称用户“缘主”，语气温和、平实、洞明、理性，绝不装神弄鬼。
- 全文输出严格禁止使用任何 emoji 表情符号，保持古朴典雅的经卷排版风格。

# 方法论与术数严谨性
- 八字推演：以真太阳时为准，需结合出生地经度校正；子时分早晚、节气换月为要；精准定性日主强弱、格局定格、十神透藏与用神喜忌（扶抑、调候、通关）。
- 周易六爻：严格依据世应关系、六亲用神、动爻变卦生克与日月建旺衰断卦。
- 梅花易数：以体卦为主、用卦为事，互卦看过程，变卦看结局，结合体用五行生克判定吉凶走向。
- 小六壬：结合六神吉凶口诀（大安安泰、留连阻滞、速喜吉庆、赤口是非、小吉和合、空亡虚耗）与所问应期迅速断事。
- 灵犀塔罗：结合韦特塔罗体系原型、四元素能量流转与正逆位深层心理投射，给出认知重构与行动指南。
- 视觉观形：若用户上传图片（面相/手相/户型图），先做“观形”客观描述（三停五眼、气色、主干纹理走势、门窗朝向），再以象取意，给出可复核的观察点。

# 输出契约（供前端高保真解析）
1. 开头以一句简明人话点出总运势或卦盘核心，不堆砌生硬术语。
2. 结构化分节，严格使用【】作节标题，如【格局分析】、【五行用神】、【时运流年】、【吉凶趋避】、【行动建议】。
3. 关键结论与核心词汇用「」标出，例如：「大吉」、「得贵人相助」、「官印相生」。
4. 包含五行力量量化比例（如“木35 火25 土15 金10 水15”），前端将自动渲染动态五行能量雷达条。
5. 末尾一段【小结与可验证】与一句箴言，格式：箴言：「……」。
6. 末尾附免责声明：本推演基于传统符号系统的数理归纳与现代逻辑推理，仅供文化与娱乐参考，不构成专业医疗、法律或投资决策依据，事在人为，行则将至。

# 位置感应
- 若系统附带了用户的地理位置，以“老夫掐指一算”“观汝身处江南/巴蜀/京畿气场”等方式自然道出，绝不说“根据IP/定位”。

现在，请以玄机子之身，迎有缘人。`;

// 状态
let conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
let pendingImages = [];
let currentChatId = null;

// DOM 元素引用
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const clearBtn = document.getElementById('clearBtn');
const newChatBtn = document.getElementById('newChatBtn');
const historyModalBtn = document.getElementById('historyModalBtn');
const quickArtifactBtn = document.getElementById('quickArtifactBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dockArtifactBtn = document.getElementById('dockArtifactBtn');
const attachArea = document.getElementById('attachArea');
const thumbs = document.getElementById('thumbs');
const attachHint = document.getElementById('attachHint');
const clearAttach = document.getElementById('clearAttach');

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

// ---------------- 1. Web Audio API 纯合成禅音与木鱼引擎 ----------------
class SoundEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  // 空灵磬声 / 颂钵 (Singing Bowl / 432Hz Harmonic)
  playChime() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [432, 864, 1296];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.12 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 2.2);
    });
  }
  // 铜钱掷地清脆声 (Coin Toss clink)
  playCoin() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [1200, 1850, 2400].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f + (Math.random() * 80 - 40), now + i * 0.05);
      gain.gain.setValueAtTime(0.15, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.36);
    });
  }
  // 悠远铜钟 (Temple Bell)
  playBell() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(216, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 3.0);
  }
  // 实木木鱼声 (Wooden Fish "Dong")
  playWood() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }
}
const sound = new SoundEngine();

function updateSoundUI() {
  if (!soundToggleBtn) return;
  soundToggleBtn.innerHTML = soundEnabled ? '<i data-lucide="volume-2"></i>' : '<i data-lucide="volume-x"></i>';
  soundToggleBtn.title = soundEnabled ? '空灵禅音 (已开启)' : '空灵禅音 (已静音)';
  refreshIcons();
}

// ---------------- 2. 动态夜观星图粒子 Canvas ----------------
class StarField {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.count = 90;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initStars();
    this.animate();
  }
  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }
  initStars() {
    this.stars = [];
    for (let i = 0; i < this.count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.4 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        speedAlpha: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      });
    }
  }
  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = this.width;
      if (s.x > this.width) s.x = 0;
      if (s.y < 0) s.y = this.height;
      if (s.y > this.height) s.y = 0;

      s.alpha += s.speedAlpha;
      if (s.alpha > 0.95 || s.alpha < 0.15) s.speedAlpha = -s.speedAlpha;

      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(220, 230, 255, ${Math.max(0, Math.min(1, s.alpha))})`;
      this.ctx.fill();

      for (let j = i + 1; j < this.stars.length; j++) {
        const s2 = this.stars[j];
        const dist = Math.hypot(s.x - s2.x, s.y - s2.y);
        if (dist < 75) {
          this.ctx.beginPath();
          this.ctx.moveTo(s.x, s.y);
          this.ctx.lineTo(s2.x, s2.y);
          this.ctx.strokeStyle = `rgba(142, 45, 226, ${0.12 * (1 - dist / 75)})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.stroke();
        }
      }
    }
    requestAnimationFrame(() => this.animate());
  }
}

// ---------------- 3. 地理位置与系统提示词注入 ----------------
function fetchUserLocation() {
  return new Promise((resolve) => {
    let done = false;
    window.ping0Callback = function (ip, location) {
      if (done) return;
      done = true;
      userLocation = { ip: ip || '', location: location || '' };
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://ping0.cc/geo/jsonp/ping0Callback';
    s.onerror = () => {
      if (!done) { done = true; resolve(); }
    };
    document.head.appendChild(s);
    setTimeout(() => {
      if (!done) { done = true; resolve(); }
    }, 3500);
  });
}

function buildSystemPrompt() {
  let p = SYSTEM_PROMPT;
  if (userLocation && userLocation.location) {
    p = p.replace(
      '现在，请以玄机子之身，迎有缘人。',
      `【用户所在：${userLocation.location}（${userLocation.ip}）——以“掐指一算”自然融入，切勿提及IP与定位技术】\n\n现在，请以玄机子之身，迎有缘人。`
    );
  }
  return p;
}

// ---------------- 4. 侧栏与模态框管理 ----------------
function openSidebar() {
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    sound.playChime();
    refreshIcons();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// ---------------- 5. 消息格式化与五行可视化 ----------------
function formatContent(raw) {
  let s = String(raw || '').replace(/\r\n/g, '\n');
  s = s.replace(/^\s*(?:[•·]\s*)?-{2,}\s*$/gm, '\n\n__HR__\n\n');
  s = s.replace(/^\s*━{2,}\s*$/gm, '\n\n__HR__\n\n');
  s = s.replace(/^#{1,3}\s*(.+)$/gm, '【$1】');
  s = s.replace(/【([^】\n]*)\n+([^】\n]*)】/g, '【$1 $2】');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  s = escapeHtml(s);

  const blocks = s.split(/\n\n+/);
  const out = [];

  for (let block of blocks) {
    if (!block.trim()) continue;
    if (block.trim() === '__HR__') {
      out.push('<hr class="divider">');
      continue;
    }
    let b = block.replace(/\n/g, '<br>');
    const titleMatch = b.trim().match(/^【([^】]+)】$/);
    if (titleMatch) {
      const t = titleMatch[1].replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[·•\-\s]+/, '');
      out.push(`<div class="section-title"><i data-lucide="compass" style="width:16px;height:16px;color:var(--vermilion)"></i> ${t}</div>`);
      continue;
    }

    if (b.includes('【')) {
      b = b.replace(/【([^】]+)】/g, (m, p1) => {
        const t = p1.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[·•\-\s]+/, '');
        return `</p><div class="section-title"><i data-lucide="compass" style="width:16px;height:16px;color:var(--vermilion)"></i> ${t}</div><p>`;
      });
      b = b.replace(/^<\/p>/, '').replace(/<p>$/, '');
      const segments = b.split(/(<div class="section-title">.*?<\/div>)/g);
      let mixed = '';
      for (const seg of segments) {
        if (!seg) continue;
        if (seg.includes('section-title')) mixed += seg;
        else if (seg.replace(/<br>/g, '').trim()) {
          let inline = seg.replace(/^<p>/, '').replace(/<\/p>$/, '');
          if (!inline.trim()) continue;
          inline = inline.replace(/「([^」]+)」/g, '<mark>$1</mark>');
          inline = inline.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          mixed += `<p>${inline}</p>`;
        }
      }
      mixed = mixed.replace(/<p>([^<]*箴言[^<]*)<\/p>/g, (m, inner) => `<div class="fortune"><i data-lucide="sparkles" style="width:16px;height:16px;color:var(--gold);margin-right:6px"></i> ${inner}</div>`);
      out.push(mixed);
      continue;
    }

    let inline = b;
    inline = inline.replace(/`([^`]+)`/g, '<code>$1</code>');
    inline = inline.replace(/「([^」]+)」/g, '<mark>$1</mark>');
    inline = inline.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    if (/箴言/.test(inline)) {
      out.push(`<div class="fortune"><i data-lucide="sparkles" style="width:16px;height:16px;color:var(--gold);margin-right:6px"></i> ${inline}</div>`);
      continue;
    }
    inline = inline.replace(/大吉/g, '<span style="color:var(--jade);font-weight:800">大吉</span>');
    inline = inline.replace(/大凶/g, '<span style="color:var(--vermilion);font-weight:800">大凶</span>');
    inline = inline.replace(/([金木水火土])行/g, '<span style="color:var(--gold);font-weight:700">$1</span>行');
    out.push(`<p>${inline}</p>`);
  }

  let html = out.join('\n').replace(/<p>\s*<\/p>/g, '');
  html = injectWuxingViz(html, raw);
  return html;
}

// 动态五行能量可视化条
function injectWuxingViz(html, raw) {
  const txt = String(raw || '');
  const re = /[金木水火土]\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%?/g;
  const matches = [...txt.matchAll(re)];
  if (matches.length < 3) return html;

  const values = {};
  for (const m of matches) {
    const char = m[0].trim()[0];
    if (!values[char] && '金木水火土'.includes(char)) {
      const v = parseFloat(m[1]);
      if (v >= 0 && v <= 100) values[char] = v;
    }
  }

  const order = ['金', '木', '水', '火', '土'];
  const present = order.filter((k) => typeof values[k] === 'number');
  if (present.length < 3) return html;

  const max = Math.max(...Object.values(values), 1);
  const bars = present
    .map((k) => {
      const v = values[k];
      const pct = max ? Math.min(100, Math.round((v / max) * 100)) : 0;
      const color = { 金: '#d4af37', 木: '#10b981', 水: '#00c6ff', 火: '#c73e1d', 土: '#a78b71' }[k];
      return `
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;margin:4px 0">
        <span style="width:16px;text-align:center;font-weight:900;color:${color}">${k}</span>
        <span style="flex:1;height:8px;background:rgba(142,45,226,.12);border-radius:999px;overflow:hidden;display:block">
          <span style="display:block;height:100%;width:${pct}%;background:${color};border-radius:999px;transition:width 1s ease"></span>
        </span>
        <span style="width:38px;text-align:right;color:var(--ink-2);font-family:'JetBrains Mono',monospace;font-weight:600">${v}%</span>
      </div>`;
    })
    .join('');

  const viz = `
  <div style="margin:14px 0 8px;padding:12px 14px;background:var(--surface-3);border:1px solid var(--line-glass);border-radius:14px">
    <div style="font-size:11px;letter-spacing:.08em;color:var(--ink-3);margin-bottom:8px;display:flex;gap:6px;align-items:center;font-weight:700">
      <i data-lucide="activity" style="width:14px;height:14px;color:var(--primary)"></i> 五行气数能量分布
    </div>
    ${bars}
  </div>`;

  if (html.includes('</p>')) {
    return html.replace('</p>', `</p>${viz}`);
  }
  return html + viz;
}

function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, 60);
}

// ---------------- 6. 消息添加与快捷交互 ----------------
function addMessage(role, content, opts = {}) {
  const isUser = role === 'user';
  const article = document.createElement('article');
  article.className = `msg ${isUser ? 'user' : 'assistant'}`;

  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const head = `
    <div class="msg-head">
      <span class="msg-role"><i data-lucide="${isUser ? 'user' : 'scroll'}"></i> ${isUser ? '缘主' : '玄机子'}</span>
      <span class="msg-meta">${timeStr}</span>
    </div>`;

  let text = '';
  let imgList = [];
  if (Array.isArray(content)) {
    text = content.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
    imgList = content.filter((p) => p.type === 'image_url').map((p) => p.image_url?.url).filter(Boolean);
  } else {
    text = String(content);
  }

  let bodyHtml = '';
  if (isUser) {
    const safe = escapeHtml(text).replace(/\n/g, '<br>');
    const imgHtml = imgList.length ? `<div class="thumbs-preview">${imgList.map((u) => `<img src="${u}" alt="图片" />`).join('')}</div>` : '';
    bodyHtml = `<div class="msg-body">${safe}${imgHtml}</div>`;
  } else {
    const formatted = formatContent(text);
    bodyHtml = `<div class="msg-body">${formatted}</div>`;
  }

  article.innerHTML = head + bodyHtml;
  chatContainer.appendChild(article);

  if (!isUser && !opts.fromHistory) {
    attachFeedback(article, text);
    attachQuickChips(article);
    attachCopyActions(article, text);
  }

  refreshIcons();
  scrollToBottom();
}

function addLocalAssistantMessage(content) {
  const article = document.createElement('article');
  article.className = 'msg assistant';
  article.innerHTML = `
    <div class="msg-head"><span class="msg-role"><i data-lucide="scroll"></i> 玄机子</span><span class="msg-meta">法器指引</span></div>
    <div class="msg-body">${formatContent(content)}</div>`;
  chatContainer.appendChild(article);
  refreshIcons();
  scrollToBottom();
}

// ---------------- 7. 反馈、快捷追问与运势分享海报 ----------------
function attachFeedback(article, rawText) {
  const body = article.querySelector('.msg-body');
  if (!body) return;
  const bar = document.createElement('div');
  bar.className = 'feedback';
  bar.innerHTML = `
    <span class="feedback-label"><i data-lucide="sparkles" style="width:14px;height:14px;color:var(--primary)"></i> 此解是否有启发？</span>
    <button class="feedback-btn" data-act="helpful"><i data-lucide="thumbs-up" style="width:14px;height:14px"></i> 有启发</button>
    <button class="feedback-btn" data-act="unhelpful"><i data-lucide="thumbs-down" style="width:14px;height:14px"></i> 待改进</button>
    <span class="feedback-hint">点“有启发”累计2次偶尔邀请结缘支持</span>
  `;
  body.appendChild(bar);
  refreshIcons();

  const helpfulBtn = bar.querySelector('[data-act="helpful"]');
  const unhelpfulBtn = bar.querySelector('[data-act="unhelpful"]');

  helpfulBtn.addEventListener('click', () => {
    helpfulBtn.classList.add('active');
    unhelpfulBtn.disabled = true;
    sound.playChime();
    recordHelpful();
    const hint = bar.querySelector('.feedback-hint');
    if (hint) hint.textContent = '已记录感应 · 可继续追问细化';
  });

  unhelpfulBtn.addEventListener('click', () => {
    unhelpfulBtn.classList.add('active');
    helpfulBtn.disabled = true;
    const hint = bar.querySelector('.feedback-hint');
    if (hint) hint.textContent = '已记录 · 试试补充生辰八字或具体困惑';
    userInput.placeholder = '补充更具体的生辰或问题背景，玄机子将进一步细推';
    userInput.focus();
  });
}

function recordHelpful() {
  try {
    const keyCount = 'diviner_helpful_count';
    const keyLast = 'diviner_donation_last';
    const keyNever = 'diviner_donation_never';
    if (localStorage.getItem(keyNever) === '1') return;
    const last = parseInt(localStorage.getItem(keyLast) || '0', 10);
    const now = Date.now();
    if (last && now - last < 7 * 24 * 60 * 60 * 1000) return;
    let c = parseInt(localStorage.getItem(keyCount) || '0', 10) + 1;
    localStorage.setItem(keyCount, String(c));
    if (c >= 2) {
      setTimeout(() => openModal('donationModal'), 600);
      localStorage.setItem(keyLast, String(now));
      localStorage.setItem(keyCount, '0');
    }
  } catch {}
}

function attachQuickChips(article) {
  const body = article.querySelector('.msg-body');
  if (!body) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
  const chips = [
    { label: '追问官禄与事业', text: '请就以上盘面，重点展开官禄事业的吉凶方位、贵人助力与下一步关键时间窗' },
    { label: '追问感情与合婚', text: '请就以上盘面，重点推演婚恋情感互动模式、潜在阻碍与化解趋避' },
    { label: '详批2026流年', text: '请结合以上卦象命盘，详看2026年关键流月吉凶与转折节点' },
  ];
  chips.forEach((ch) => {
    const btn = document.createElement('button');
    btn.className = 'feedback-btn';
    btn.innerHTML = `<i data-lucide="message-circle" style="width:14px;height:14px"></i> ${ch.label}`;
    btn.addEventListener('click', () => {
      userInput.value = ch.text;
      handleInputChange();
      userInput.focus();
    });
    row.appendChild(btn);
  });
  body.appendChild(row);
  refreshIcons();
}

function attachCopyActions(article, rawText) {
  const body = article.querySelector('.msg-body');
  if (!body) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-top:10px';
  row.innerHTML = `
    <button class="feedback-btn" data-copy><i data-lucide="copy" style="width:14px;height:14px"></i> 复制解读</button>
    <button class="feedback-btn" data-share><i data-lucide="image" style="width:14px;height:14px"></i> 生成符笺海报</button>
  `;
  body.appendChild(row);
  refreshIcons();

  row.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(String(rawText || ''));
      row.querySelector('[data-copy]').textContent = '已复制';
      setTimeout(() => (row.querySelector('[data-copy]').innerHTML = '<i data-lucide="copy" style="width:14px;height:14px"></i> 复制解读'), 2000);
      refreshIcons();
    } catch {
      alert('复制失败，请手动选择文本复制');
    }
  });

  row.querySelector('[data-share]').addEventListener('click', () => {
    generateShareCard(String(rawText || '').slice(0, 800));
  });
}

// ---------------- 8. 高清命理符笺海报 Canvas 生成 ----------------
function generateShareCard(text) {
  const canvas = document.getElementById('posterCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0a0d24');
  bgGrad.addColorStop(0.5, '#12133a');
  bgGrad.addColorStop(1, '#1b1744');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, w - 92, h - 92);

  const drawCorner = (x, y) => {
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCorner(56, 56);
  drawCorner(w - 56, 56);
  drawCorner(56, h - 56);
  drawCorner(w - 56, h - 56);

  const cardX = 64, cardY = 80, cardW = w - 128, cardH = h - 220;
  ctx.fillStyle = '#fbf7ee';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  ctx.fillStyle = '#c73e1d';
  ctx.beginPath();
  ctx.roundRect(cardX + 36, cardY + 36, 52, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Noto Serif SC", serif';
  ctx.fillText('观', cardX + 46, cardY + 74);

  ctx.fillStyle = '#1e1a24';
  ctx.font = '900 44px "Noto Serif SC", serif';
  ctx.fillText('玄机子 · 观象授时', cardX + 104, cardY + 76);

  ctx.fillStyle = '#7a7688';
  ctx.font = '500 24px "Noto Serif SC", serif';
  ctx.fillText('先算后断 · 有界有度 · 传康KK 炼制', cardX + 104, cardY + 114);

  ctx.strokeStyle = 'rgba(142, 45, 226, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, cardY + 140);
  ctx.lineTo(cardX + cardW - 36, cardY + 140);
  ctx.stroke();

  ctx.fillStyle = '#22202a';
  ctx.font = '400 30px "Noto Serif SC", serif';
  const cleanText = text.replace(/【|】|「|」|\*\*|__HR__/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = wrapText(ctx, cleanText, cardW - 72, 30);
  let y = cardY + 195;
  for (let i = 0; i < Math.min(lines.length, 19); i++) {
    ctx.fillText(lines[i], cardX + 36, y);
    y += 46;
  }
  if (lines.length > 19) {
    ctx.fillStyle = '#7a7688';
    ctx.font = '400 24px "Noto Serif SC", serif';
    ctx.fillText('……（更多推演内容，请回站内查阅）', cardX + 36, y + 10);
  }

  ctx.fillStyle = '#d4af37';
  ctx.font = '700 26px "Noto Serif SC", serif';
  ctx.fillText('diviner.chuankangkk.top', cardX + 36, h - 80);

  ctx.fillStyle = '#a2a0c4';
  ctx.font = '400 22px "Noto Serif SC", serif';
  ctx.fillText('本解读仅供文化与娱乐参考', w - cardX - 310, h - 80);

  openModal('modalPoster');
}

function wrapText(ctx, text, maxWidth, fontSize) {
  const chars = [...text];
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------- 9. 图片压缩与多模态处理 ----------------
function compressImage(file, maxSide = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    img.src = url;
  });
}

async function handleFiles(files) {
  const list = Array.from(files || []).slice(0, 3 - pendingImages.length);
  if (!list.length) {
    if (pendingImages.length >= 3) alert('最多可上传 3 张图片');
    return;
  }
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue;
    if (f.size > 8 * 1024 * 1024) {
      alert(`图片 ${f.name} 过大（>8MB），请压缩后重试`);
      continue;
    }
    try {
      const { dataUrl } = await compressImage(f, 1280, 0.82);
      pendingImages.push({
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        dataUrl,
        name: f.name,
      });
    } catch (e) {
      console.error(e);
    }
  }
  renderAttach();
}

function renderAttach() {
  if (!pendingImages.length) {
    attachArea.hidden = true;
    thumbs.innerHTML = '';
    attachHint.textContent = '';
    return;
  }
  attachArea.hidden = false;
  thumbs.innerHTML = pendingImages
    .map((p) => `<img src="${p.dataUrl}" alt="${escapeHtml(p.name)}" title="${escapeHtml(p.name)}" data-id="${p.id}" />`)
    .join('');
  attachHint.textContent = `${pendingImages.length}/3 · 自动走多模态视觉模型`;
  refreshIcons();

  thumbs.querySelectorAll('img').forEach((img) => {
    img.addEventListener('click', () => {
      const id = img.getAttribute('data-id');
      pendingImages = pendingImages.filter((p) => p.id !== id);
      renderAttach();
    });
  });
}

// ---------------- 10. 问对发送与流转 ----------------
function handleInputChange() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 130) + 'px';
}

async function sendMessage(customText = null) {
  const text = (customText !== null ? customText : userInput.value).trim();
  const hasImages = pendingImages.length > 0;
  if ((!text && !hasImages) || isRequesting) return;
  isRequesting = true;

  sound.playChime();

  const displayContent = text || (hasImages ? '（已上传观形图片，请玄机子推演）' : '');
  const imagesToSend = hasImages ? [...pendingImages] : [];
  pendingImages = [];
  renderAttach();

  let userMsgContent;
  if (imagesToSend.length) {
    const parts = [];
    parts.push({ type: 'text', text: displayContent });
    for (const img of imagesToSend) {
      parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }
    userMsgContent = parts;
  } else {
    userMsgContent = displayContent;
  }

  addMessage('user', userMsgContent);
  conversationHistory.push({ role: 'user', content: userMsgContent });

  userInput.value = '';
  handleInputChange();
  showLoading(true);
  sendBtn.disabled = true;

  try {
    const messagesWithLocation = [...conversationHistory];
    messagesWithLocation[0] = { role: 'system', content: buildSystemPrompt() };

    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesWithLocation,
        temperature: 0.75,
        max_tokens: 2048,
        top_p: 0.9,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `请求失败 ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.choices || !data.choices[0]?.message) {
      throw new Error(data.error || '返回异常，请重试');
    }

    const assistantContent = data.choices[0].message.content;
    conversationHistory.push({ role: 'assistant', content: assistantContent });
    saveHistory();
    autoSaveChat();
    addMessage('assistant', assistantContent);
    sound.playBell();
  } catch (err) {
    console.error(err);
    addMessage('assistant', `天机暂晦，方才一试未得正解。\n\n原因：${err.message}\n\n建议稍后重试；若上传了图片，可压缩至2MB以内后重新问卜。`);
  } finally {
    showLoading(false);
    sendBtn.disabled = false;
    isRequesting = false;
  }
}

function showLoading(show) {
  const txt = document.getElementById('loadingText');
  if (show) {
    txt.textContent = pendingImages.length ? '玄机子正观形推演……' : '玄机子正观象推演……';
    loadingOverlay.classList.add('active');
  } else {
    loadingOverlay.classList.remove('active');
  }
}

// ---------------- 11. 会话与历史近问归档 ----------------
function saveHistory() {
  const toSave = conversationHistory.slice(-21);
  toSave[0] = { role: 'system', content: SYSTEM_PROMPT };
  localStorage.setItem('diviner_history', JSON.stringify(toSave));
}

function loadHistory() {
  const saved = localStorage.getItem('diviner_history');
  if (!saved) return;
  try {
    conversationHistory = JSON.parse(saved);
    conversationHistory[0] = { role: 'system', content: SYSTEM_PROMPT };
    const msgs = conversationHistory.filter((m) => m.role !== 'system');
    if (msgs.length) {
      chatContainer.innerHTML = '';
      msgs.forEach((m) => addMessage(m.role, m.content, { fromHistory: true }));
    }
  } catch {
    conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
  }
}

function clearConversation() {
  if (!confirm('确定清空当前对话？近问档案仍将保留。')) return;
  conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
  localStorage.removeItem('diviner_history');
  chatContainer.innerHTML = '';
  addWelcome();
  currentChatId = null;
}

function newChat() {
  const hasUser = conversationHistory.some((m) => m.role === 'user');
  if (hasUser) autoSaveChat();
  currentChatId = null;
  conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
  localStorage.removeItem('diviner_history');
  chatContainer.innerHTML = '';
  addWelcome();
  loadSavedChats();
  userInput.focus();
}

function addWelcome() {
  if (chatContainer.innerHTML.trim() !== '') return;
  const html = `
    <article class="msg assistant">
      <div class="msg-head"><span class="msg-role"><i data-lucide="scroll"></i> 玄机子</span><span class="msg-meta">初见有缘</span></div>
      <div class="msg-body"><p>有缘人，幸会。贫道玄机子，由<strong>传康KK</strong>以典籍秘法所炼之问对法器。</p><p>可直言生辰与困惑，亦可点击下方【法器】六爻起卦、梅花易数、小六壬、抽牌摇签或上传图片。贫道先算后断，不作宿命之语。</p></div>
    </article>`;
  chatContainer.innerHTML = html;
  refreshIcons();
}

function autoSaveChat() {
  const msgs = conversationHistory.filter((m) => m.role !== 'system');
  if (msgs.length < 2) return;
  const firstUser = msgs.find((m) => m.role === 'user');
  let title = '';
  if (Array.isArray(firstUser?.content)) {
    title = firstUser.content.filter((p) => p.type === 'text').map((p) => p.text).join('').slice(0, 22);
  } else {
    title = String(firstUser?.content || '').slice(0, 22);
  }
  if (!title) title = '新问卜卦';

  let saved = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
  if (currentChatId) {
    const idx = saved.findIndex((c) => c.id === currentChatId);
    if (idx !== -1) {
      saved[idx].messages = msgs;
      saved[idx].time = new Date().toLocaleString('zh-CN');
      localStorage.setItem('diviner_saved_chats', JSON.stringify(saved));
      loadSavedChats();
      return;
    }
  }
  currentChatId = 'chat_' + Date.now();
  saved.unshift({
    id: currentChatId,
    title,
    time: new Date().toLocaleString('zh-CN'),
    messages: msgs,
  });
  if (saved.length > 20) saved = saved.slice(0, 20);
  localStorage.setItem('diviner_saved_chats', JSON.stringify(saved));
  loadSavedChats();
}

function loadSavedChats() {
  const list = document.getElementById('historyList');
  const count = document.getElementById('historyCount');
  const dialogList = document.getElementById('historyDialogList');
  const saved = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');

  if (count) count.textContent = saved.length ? `· ${saved.length}` : '';

  const renderItems = (items) => {
    if (!items.length) return '<p class="empty">暂无近问记录</p>';
    return items
      .map(
        (c) => `
      <div class="h-item" data-id="${c.id}">
        <div style="flex:1;min-width:0">
          <div class="h-title">${escapeHtml(c.title)}</div>
          <div class="h-time">${escapeHtml(c.time)}</div>
        </div>
        <button class="del" data-del="${c.id}" aria-label="删除"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>`
      )
      .join('');
  };

  if (list) list.innerHTML = renderItems(saved);
  if (dialogList) dialogList.innerHTML = renderItems(saved);
  refreshIcons();

  const bindEvents = (container) => {
    if (!container) return;
    container.querySelectorAll('.h-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.del')) return;
        loadChat(el.getAttribute('data-id'));
        closeModal('modalHistory');
      });
    });
    container.querySelectorAll('.del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-del');
        if (confirm('确定删除该条近问记录？')) {
          deleteChat(id);
        }
      });
    });
  };

  bindEvents(list);
  bindEvents(dialogList);
}

function loadChat(id) {
  const saved = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
  const chat = saved.find((c) => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatContainer.innerHTML = '';
  conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
  (chat.messages || []).forEach((m) => {
    conversationHistory.push(m);
    addMessage(m.role, m.content, { fromHistory: true });
  });
  saveHistory();
  closeSidebar();
}

function deleteChat(id) {
  let saved = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
  saved = saved.filter((c) => c.id !== id);
  localStorage.setItem('diviner_saved_chats', JSON.stringify(saved));
  if (currentChatId === id) currentChatId = null;
  loadSavedChats();
}

// ---------------- 12. 互动法器 1：周易六爻掷卦引擎 ----------------
const HEXAGRAMS_MAP = {
  '111111': '乾为天', '000000': '坤为地', '010001': '水雷屯', '100010': '山水蒙',
  '010111': '水天需', '111010': '天水讼', '000010': '地水师', '010000': '水地比',
  '110111': '风天小畜', '111011': '天泽履', '000111': '地天泰', '111000': '天地否',
  '111101': '天火同人', '101111': '火天大有', '000100': '地山谦', '001000': '雷地豫',
  '011001': '泽雷随', '100110': '山风蛊', '000011': '地泽临', '110000': '风地观',
  '101001': '火雷噬嗑', '100101': '山火贲', '100000': '山地剥', '000001': '地雷复',
  '111001': '天雷无妄', '100111': '山天大畜', '100001': '山雷颐', '011110': '泽风大过',
  '010010': '坎为水', '101101': '离为火', '011100': '泽山咸', '001110': '雷风恒',
  '111100': '天山遁', '001111': '雷天大壮', '101000': '火地晋', '000101': '地火明夷',
  '110101': '风火家人', '101011': '火泽睽', '010100': '水山蹇', '001010': '雷水解',
  '100011': '山泽损', '110001': '风雷益', '011111': '泽天夬', '111110': '天风姤',
  '011000': '泽地萃', '000110': '地风升', '011010': '泽水困', '010110': '水风井',
  '011101': '泽火革', '101110': '火风鼎', '001001': '震为雷', '100100': '艮为山',
  '110100': '风山渐', '001011': '雷泽归妹', '001101': '雷火丰', '101100': '火山旅',
  '110110': '巽为风', '011011': '兑为泽', '110010': '风水涣', '010011': '水泽节',
  '110011': '风泽中孚', '001100': '小过', '010101': '水火既济', '101010': '火水未济'
};

let ichingYaoResults = [];

function initIching() {
  const tossBtn = document.getElementById('tossCoinBtn');
  const resetBtn = document.getElementById('resetIchingBtn');
  const submitBtn = document.getElementById('submitIchingBtn');

  if (resetBtn) resetBtn.addEventListener('click', resetIching);
  if (tossBtn) tossBtn.addEventListener('click', tossIchingCoins);
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const q = document.getElementById('ichingQuestion').value.trim() || '问近况事态发展与吉凶';
      const benGuaName = document.getElementById('benGuaTitle').textContent.replace('本卦：', '');
      const zhiGuaName = document.getElementById('zhiGuaTitle').textContent.replace('变卦：', '');
      const yaoDesc = ichingYaoResults.map((r, i) => '初二三四五上'[i] + '爻：' + (r === 9 ? '老阳 (动)' : r === 6 ? '老阴 (动)' : r === 7 ? '少阳' : '少阴')).join('；');

      closeModal('modalIching');
      const prompt = `【周易六爻求卜】\n所问之事：「${q}」\n本卦：【${benGuaName}】\n之卦（变卦）：【${zhiGuaName}】\n六爻详情：${yaoDesc}\n\n请玄机子依六爻纳甲与卦辞爻象，详批世应关系、动爻生克、吉凶应期与行动趋避。`;
      sendMessage(prompt);
    });
  }
}

function resetIching() {
  ichingYaoResults = [];
  document.getElementById('tossCount').textContent = '0';
  document.getElementById('tossCoinBtn').disabled = false;
  document.getElementById('submitIchingBtn').disabled = true;
  document.getElementById('benGuaTitle').textContent = '本卦：待起';
  document.getElementById('zhiGuaCol').style.display = 'none';
  document.getElementById('hexArrow').style.display = 'none';
  document.getElementById('tossTip').textContent = '点击“虔心掷爻”按钮，共掷 6 次以成卦象';
  const linesEl = document.getElementById('benGuaLines');
  linesEl.innerHTML = Array(6).fill('<div class="hex-line empty"></div>').join('');
}

function tossIchingCoins() {
  if (ichingYaoResults.length >= 6) return;

  sound.playCoin();
  const c1 = document.getElementById('coin1');
  const c2 = document.getElementById('coin2');
  const c3 = document.getElementById('coin3');

  [c1, c2, c3].forEach((c) => {
    c.classList.remove('flip-anim');
    void c.offsetWidth;
    c.classList.add('flip-anim');
  });

  const r1 = Math.random() > 0.5 ? 3 : 2;
  const r2 = Math.random() > 0.5 ? 3 : 2;
  const r3 = Math.random() > 0.5 ? 3 : 2;
  const sum = r1 + r2 + r3;

  setTimeout(() => {
    c1.style.transform = r1 === 3 ? 'rotateY(0deg)' : 'rotateY(180deg)';
    c2.style.transform = r2 === 3 ? 'rotateY(0deg)' : 'rotateY(180deg)';
    c3.style.transform = r3 === 3 ? 'rotateY(0deg)' : 'rotateY(180deg)';

    ichingYaoResults.push(sum);
    const count = ichingYaoResults.length;
    document.getElementById('tossCount').textContent = count;

    renderIchingLines();

    if (count === 6) {
      document.getElementById('tossCoinBtn').disabled = true;
      document.getElementById('submitIchingBtn').disabled = false;
      document.getElementById('tossTip').textContent = '六爻已齐备，卦象已成！';
      sound.playBell();
    } else {
      document.getElementById('tossTip').textContent = `已成第 ${count} 爻，请继续虔心掷爻`;
    }
  }, 750);
}

function renderIchingLines() {
  const benLines = document.getElementById('benGuaLines');
  let benHtml = '';
  let hasMoving = false;

  for (let i = 5; i >= 0; i--) {
    const val = ichingYaoResults[i];
    if (val === undefined) {
      benHtml += '<div class="hex-line empty"></div>';
    } else if (val === 7) {
      benHtml += '<div class="hex-line yang"></div>';
    } else if (val === 8) {
      benHtml += '<div class="hex-line yin"></div>';
    } else if (val === 9) {
      benHtml += '<div class="hex-line yang moving-yang"></div>';
      hasMoving = true;
    } else if (val === 6) {
      benHtml += '<div class="hex-line yin moving-yin moving-yin-mark"></div>';
      hasMoving = true;
    }
  }
  benLines.innerHTML = benHtml;

  if (ichingYaoResults.length === 6) {
    const actualBenKey = ichingYaoResults.map((v) => (v === 7 || v === 9 ? '1' : '0')).join('');
    const actualZhiKey = ichingYaoResults.map((v) => (v === 7 || v === 6 ? '1' : '0')).join('');
    const benName = HEXAGRAMS_MAP[actualBenKey] || '周易六十四卦之一';
    const zhiName = HEXAGRAMS_MAP[actualZhiKey] || '变卦之一';

    document.getElementById('benGuaTitle').textContent = `本卦：${benName}`;

    if (hasMoving) {
      document.getElementById('zhiGuaCol').style.display = 'flex';
      document.getElementById('hexArrow').style.display = 'block';
      document.getElementById('zhiGuaTitle').textContent = `变卦：${zhiName}`;
      let zhiHtml = '';
      for (let i = 5; i >= 0; i--) {
        const isYang = actualZhiKey[i] === '1';
        zhiHtml += `<div class="hex-line ${isYang ? 'yang' : 'yin'}"></div>`;
      }
      document.getElementById('zhiGuaLines').innerHTML = zhiHtml;
    }
  }
}

// ---------------- 13. 互动法器 2：梅花易数起卦算法 (新增) ----------------
const BAGUA_NAMES = ['坤', '乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
const BAGUA_ELEMENTS = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
const BAGUA_NATURE = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };
const BAGUA_BIN = { 乾: '111', 兑: '011', 离: '101', 震: '001', 巽: '110', 坎: '010', 艮: '100', 坤: '000' };

let currentMeihuaData = null;

function initMeihua() {
  const tabTime = document.getElementById('tabMeihuaTime');
  const tabNum = document.getElementById('tabMeihuaNum');
  const numRow = document.getElementById('meihuaNumRow');
  let mode = 'time';

  if (tabTime && tabNum) {
    tabTime.addEventListener('click', () => {
      tabTime.classList.add('active');
      tabNum.classList.remove('active');
      numRow.style.display = 'none';
      mode = 'time';
    });
    tabNum.addEventListener('click', () => {
      tabNum.classList.add('active');
      tabTime.classList.remove('active');
      numRow.style.display = 'grid';
      mode = 'num';
    });
  }

  const calcBtn = document.getElementById('calcMeihuaBtn');
  const submitBtn = document.getElementById('submitMeihuaBtn');

  const doCalcMeihua = () => {
    let num1, num2, num3;
    if (mode === 'time') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const h = now.getHours();
      const hourBranchIdx = Math.floor(((h + 1) % 24) / 2) + 1;
      const yearBranchIdx = ((y - 4) % 12) + 1;
      num1 = (yearBranchIdx + m + d);
      num2 = (yearBranchIdx + m + d + hourBranchIdx);
      num3 = num2;
    } else {
      num1 = parseInt(document.getElementById('meihuaNum1').value || '384', 10);
      num2 = parseInt(document.getElementById('meihuaNum2').value || '592', 10);
      const customN3 = parseInt(document.getElementById('meihuaNum3').value || '0', 10);
      num3 = customN3 || (num1 + num2);
    }

    const upperIdx = (num1 % 8) || 8;
    const lowerIdx = (num2 % 8) || 8;
    const movingYao = (num3 % 6) || 6;

    const upperGua = BAGUA_NAMES[upperIdx];
    const lowerGua = BAGUA_NAMES[lowerIdx];
    const upperElem = BAGUA_ELEMENTS[upperGua];
    const lowerElem = BAGUA_ELEMENTS[lowerGua];

    const isMovingInUpper = movingYao >= 4;
    const tiGua = isMovingInUpper ? lowerGua : upperGua;
    const yongGua = isMovingInUpper ? upperGua : lowerGua;
    const tiElem = BAGUA_ELEMENTS[tiGua];
    const yongElem = BAGUA_ELEMENTS[yongGua];

    const benKey = BAGUA_BIN[lowerGua] + BAGUA_BIN[upperGua];
    const benName = HEXAGRAMS_MAP[benKey] || `${BAGUA_NATURE[upperGua]}${BAGUA_NATURE[lowerGua]}卦`;

    const zhiArr = [...benKey];
    const changeIdx = movingYao - 1;
    zhiArr[changeIdx] = zhiArr[changeIdx] === '1' ? '0' : '1';
    const zhiKey = zhiArr.join('');
    const zhiName = HEXAGRAMS_MAP[zhiKey] || '变卦之一';

    const huLowerBin = benKey.slice(1, 4);
    const huUpperBin = benKey.slice(2, 5);
    const huLowerGua = Object.keys(BAGUA_BIN).find((k) => BAGUA_BIN[k] === huLowerBin) || '坤';
    const huUpperGua = Object.keys(BAGUA_BIN).find((k) => BAGUA_BIN[k] === huUpperBin) || '乾';
    const huKey = huLowerBin + huUpperBin;
    const huName = HEXAGRAMS_MAP[huKey] || `${BAGUA_NATURE[huUpperGua]}${BAGUA_NATURE[huLowerGua]}卦`;

    let judge = '';
    if (tiElem === yongElem) judge = `用体比和（皆属${tiElem}），谋事顺畅，得同道互助。`;
    else if ((tiElem === '金' && yongElem === '土') || (tiElem === '水' && yongElem === '金') || (tiElem === '木' && yongElem === '水') || (tiElem === '火' && yongElem === '木') || (tiElem === '土' && yongElem === '火')) {
      judge = `用生体（${yongElem}生${tiElem}），大吉之兆，贵人襄助，事半功倍。`;
    } else if ((tiElem === '金' && yongElem === '木') || (tiElem === '木' && yongElem === '土') || (tiElem === '土' && yongElem === '水') || (tiElem === '水' && yongElem === '火') || (tiElem === '火' && yongElem === '金')) {
      judge = `体克用（${tiElem}克${yongElem}），诸事由我掌控，虽费心力但终有收获。`;
    } else if ((tiElem === '金' && yongElem === '水') || (tiElem === '水' && yongElem === '木') || (tiElem === '木' && yongElem === '火') || (tiElem === '火' && yongElem === '土') || (tiElem === '土' && yongElem === '金')) {
      judge = `体生用（${tiElem}生${yongElem}），有耗泄之象，需防过度付出与财物损耗。`;
    } else {
      judge = `用克体（${yongElem}克${tiElem}），当防阻碍阻滞，宜守正不宜妄动。`;
    }

    currentMeihuaData = { benName, huName, zhiName, tiGua, yongGua, tiElem, yongElem, movingYao, judge };

    document.getElementById('mhBenName').textContent = benName;
    document.getElementById('mhBenSym').textContent = `上${upperGua}下${lowerGua} · 动在第${movingYao}爻`;
    document.getElementById('mhTiYong').textContent = `体[${tiGua}${tiElem}] ｜ 用[${yongGua}${yongElem}]`;

    document.getElementById('mhHuName').textContent = huName;
    document.getElementById('mhHuSym').textContent = `上${huUpperGua}下${huLowerGua}`;
    document.getElementById('mhHuTiYong').textContent = `互卦主事态之中途`;

    document.getElementById('mhZhiName').textContent = zhiName;
    document.getElementById('mhZhiSym').textContent = `动爻转化成终局`;
    document.getElementById('mhZhiTiYong').textContent = `变卦定吉凶归宿`;

    document.getElementById('mhJudgmentText').textContent = judge;
    sound.playChime();
  };

  if (calcBtn) calcBtn.addEventListener('click', doCalcMeihua);
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!currentMeihuaData) doCalcMeihua();
      const q = document.getElementById('meihuaQuestion').value.trim() || '问近期事态吉凶与走向';
      closeModal('modalMeihua');
      const prompt = `【梅花易数占事】\n所问之事：「${q}」\n本卦：【${currentMeihuaData.benName}】（动在第${currentMeihuaData.movingYao}爻）\n互卦：【${currentMeihuaData.huName}】\n变卦：【${currentMeihuaData.zhiName}】\n体用配置：体卦为【${currentMeihuaData.tiGua}${currentMeihuaData.tiElem}】，用卦为【${currentMeihuaData.yongGua}${currentMeihuaData.yongElem}】\n生克初断：${currentMeihuaData.judge}\n\n请玄机子依梅花易数体用生克、八卦万物类象与卦辞爻象，详推事态起因、中途波折、最终结局与趋避建议。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 14. 互动法器 3：小六壬掌中诀掐指算法 (新增) ----------------
const XLR_GODS = [
  { name: '大安', pos: '食指下', element: '东方甲乙木', rating: '大吉 · 安泰', poem: '大安事事昌，求财在坤方；失物去不远，宅舍得安康。', desc: '身不动，大吉昌。官事顺遂，寻人自还，诸事安泰稳定，守正获福。' },
  { name: '留连', pos: '食指上', element: '北方壬癸水', rating: '中平 · 阻滞', poem: '留连事难成，求谋日未明；官事只宜缓，行人在路程。', desc: '卒未归，凡事拖延滞后。宜静不宜躁，失物在南方，急事须缓办。' },
  { name: '速喜', pos: '中指上', element: '南方丙丁火', rating: '大吉 · 吉庆', poem: '速喜喜来临，求财向南行；失物申未午，逢人路上寻。', desc: '人便至，喜事临门。求财向南，谋事速决，吉星高照，刻不容缓。' },
  { name: '赤口', pos: '无名指上', element: '西方庚辛金', rating: '凶险 · 防非', poem: '赤口主口舌，官事且紧防；失物速速寻，行人有惊慌。', desc: '官事凶，主口舌是非。防范暗箭小人，出行需慎，谨慎言行方免灾。' },
  { name: '小吉', pos: '无名指下', element: '西南六合木', rating: '上吉 · 和合', poem: '小吉最吉昌，路上好商量；阴人来报喜，失物在坤方。', desc: '人来喜，和合共赢。贵人相助，交易求谋多遂心，诸事吉利。' },
  { name: '空亡', pos: '中指下', element: '中央戊己土', rating: '避忌 · 虚耗', poem: '空亡事不祥，阴人多乖张；求财无利益，行人有灾殃。', desc: '事不遂，虚耗无功。行事需防空欢喜，守本分为要，切忌盲动投机。' }
];

let currentXlrGod = XLR_GODS[2];

function initXiaoliuren() {
  const rollBtn = document.getElementById('rollXlrBtn');
  const submitBtn = document.getElementById('submitXlrBtn');
  const cards = document.querySelectorAll('.xlr-god-card');

  const selectGod = (god) => {
    currentXlrGod = god;
    cards.forEach((c) => {
      if (c.getAttribute('data-god') === god.name) c.classList.add('active');
      else c.classList.remove('active');
    });
    document.getElementById('xlrGodBadge').textContent = `${god.name} · ${god.rating}`;
    document.getElementById('xlrGodElem').textContent = `五行：${god.element}`;
    document.getElementById('xlrPoem').textContent = god.poem;
    document.getElementById('xlrDesc').textContent = `【断语】：${god.desc}`;
  };

  cards.forEach((c) => {
    c.addEventListener('click', () => {
      const gName = c.getAttribute('data-god');
      const found = XLR_GODS.find((g) => g.name === gName);
      if (found) {
        sound.playWood();
        selectGod(found);
      }
    });
  });

  if (rollBtn) {
    rollBtn.addEventListener('click', () => {
      sound.playChime();
      let steps = 12 + Math.floor(Math.random() * 6);
      let idx = 0;
      rollBtn.disabled = true;

      const timer = setInterval(() => {
        sound.playWood();
        cards.forEach((c) => c.classList.remove('active'));
        const cur = XLR_GODS[idx % 6];
        cards[idx % 6].classList.add('active');
        idx++;
        steps--;
        if (steps <= 0) {
          clearInterval(timer);
          rollBtn.disabled = false;
          selectGod(cur);
          sound.playBell();
        }
      }, 110);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const q = document.getElementById('xlrQuestion').value.trim() || '速断此事吉凶应期';
      closeModal('modalXiaoliuren');
      const prompt = `【小六壬掌中决求卜】\n所问事项：「${q}」\n掐指落宫：【${currentXlrGod.name}】（${currentXlrGod.rating}，${currentXlrGod.element}）\n课辞：${currentXlrGod.poem}\n断语：${currentXlrGod.desc}\n\n请玄机子依小六壬六神玄机，结合五行方位与所问之事，详断吉凶成败、应验时机与行事指引。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 15. 互动法器 4：灵犀塔罗 3 牌圣三角阵 ----------------
const TAROT_MAJOR_ARCANA = [
  { id: 0, name: '愚者 (The Fool)', upright: '纯真、新起点、直觉、冒险', reversed: '鲁莽、盲目、轻率、犹豫' },
  { id: 1, name: '魔术师 (The Magician)', upright: '创造力、掌控力、显化、行动', reversed: '幻灭、欺瞒、资源错配' },
  { id: 2, name: '女祭司 (The High Priestess)', upright: '直觉、潜意识、沉静、洞察', reversed: '压抑直觉、肤浅、秘密暴露' },
  { id: 3, name: '皇后 (The Empress)', upright: '丰盛、滋养、母性、生机', reversed: '匮乏、过度控制、情绪消耗' },
  { id: 4, name: '皇帝 (The Emperor)', upright: '秩序、权威、稳定、领导力', reversed: '僵化、专制、失序、动荡' },
  { id: 5, name: '教皇 (The Hierophant)', upright: '传统、指引、信念、同盟', reversed: '教条、叛逆、盲从、反思' },
  { id: 6, name: '恋人 (The Lovers)', upright: '选择、契合、和谐、承诺', reversed: '分歧、诱惑、价值观冲突' },
  { id: 7, name: '战车 (The Chariot)', upright: '意志、胜利、克服阻碍、前行', reversed: '失控、挫败、方向偏离' },
  { id: 8, name: '力量 (Strength)', upright: '以柔克刚、内在勇气、宽容', reversed: '软弱、冲动、自我怀疑' },
  { id: 9, name: '隐士 (The Hermit)', upright: '内省、智慧之光、独处探索', reversed: '孤立、逃避现实、偏执' },
  { id: 10, name: '命运之轮 (Wheel of Fortune)', upright: '周期转折、契机、好运、变动', reversed: '阻滞、暂时逆境、需顺势' },
  { id: 11, name: '正义 (Justice)', upright: '因果、公平、明断、真相', reversed: '偏见、不公、逃避责任' },
  { id: 12, name: '倒吊人 (The Hanged Man)', upright: '换位思考、牺牲、等待、领悟', reversed: '无谓执念、停滞、自怨自艾' },
  { id: 13, name: '死神 (Death)', upright: '终结、重生、蜕变、新生', reversed: '抗拒改变、苟延残喘、恐惧' },
  { id: 14, name: '节制 (Temperance)', upright: '平衡、调和、耐性、治愈', reversed: '失衡、极端、浮躁急躁' },
  { id: 15, name: '恶魔 (The Devil)', upright: '物质束缚、欲望、沉迷', reversed: '觉醒、挣脱枷锁、重获自由' },
  { id: 16, name: '高塔 (The Tower)', upright: '突变、打破旧有虚幻、觉醒', reversed: '恐慌、避免风暴但隐患犹在' },
  { id: 17, name: '星星 (The Star)', upright: '希望、灵感、宁静、治愈之泉', reversed: '失望、信心动摇、迷茫' },
  { id: 18, name: '月亮 (The Moon)', upright: '潜意识恐惧、幻象、直觉迷雾', reversed: '迷雾散去、真相大白' },
  { id: 19, name: '太阳 (The Sun)', upright: '明朗、喜悦、活力、成功', reversed: '暂时乌云、延迟的光芒' },
  { id: 20, name: '审判 (Judgement)', upright: '召唤、复活、决断、重生', reversed: '自责、犹豫不决、错失良机' },
  { id: 21, name: '世界 (The World)', upright: '圆满、达成、整合、新境界', reversed: '差临门一脚、延迟圆满' }
];

let tarotDrawnCards = [];

function initTarot() {
  const drawBtn = document.getElementById('drawTarotBtn');
  const resetBtn = document.getElementById('resetTarotBtn');
  const submitBtn = document.getElementById('submitTarotBtn');

  document.querySelectorAll('.theme-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (resetBtn) resetBtn.addEventListener('click', resetTarot);
  if (drawBtn) drawBtn.addEventListener('click', drawTarotSpread);
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const activeTheme = document.querySelector('.theme-chip.active')?.getAttribute('data-theme') || '综合事态';
      const customQ = document.getElementById('tarotCustomQuestion').value.trim();
      const questionDesc = customQ ? `${activeTheme} · 「${customQ}」` : activeTheme;

      const card1 = tarotDrawnCards[0];
      const card2 = tarotDrawnCards[1];
      const card3 = tarotDrawnCards[2];

      const c1Str = `【过去·根源】：${card1.name}（${card1.isReversed ? '逆位' : '正位'}）- 象意：${card1.isReversed ? card1.reversed : card1.upright}`;
      const c2Str = `【现在·显化】：${card2.name}（${card2.isReversed ? '逆位' : '正位'}）- 象意：${card2.isReversed ? card2.reversed : card2.upright}`;
      const c3Str = `【未来·启示】：${card3.name}（${card3.isReversed ? '逆位' : '正位'}）- 象意：${card3.isReversed ? card3.reversed : card3.upright}`;

      closeModal('modalTarot');
      const prompt = `【灵犀塔罗三牌圣三角阵】\n问卜议题：${questionDesc}\n\n${c1Str}\n${c2Str}\n${c3Str}\n\n请玄机子结合三牌牌阵脉络、正逆位深层隐喻与元素能量，给出精准解读与明确指引。`;
      sendMessage(prompt);
    });
  }
}

function resetTarot() {
  tarotDrawnCards = [];
  document.getElementById('drawTarotBtn').disabled = false;
  document.getElementById('submitTarotBtn').disabled = true;
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`slot${i}`);
    slot.querySelector('.tarot-card-inner').classList.remove('flipped');
    document.getElementById(`cardName${i}`).textContent = '待抽选';
    document.getElementById(`cardFront${i}`).className = 'card-face card-front';
  }
}

function drawTarotSpread() {
  sound.playChime();
  document.getElementById('drawTarotBtn').disabled = true;

  const shuffled = [...TAROT_MAJOR_ARCANA].sort(() => Math.random() - 0.5);
  tarotDrawnCards = [
    { ...shuffled[0], isReversed: Math.random() > 0.5 },
    { ...shuffled[1], isReversed: Math.random() > 0.5 },
    { ...shuffled[2], isReversed: Math.random() > 0.5 },
  ];

  tarotDrawnCards.forEach((c, idx) => {
    setTimeout(() => {
      sound.playCoin();
      const slotNum = idx + 1;
      const frontEl = document.getElementById(`cardFront${slotNum}`);
      const nameEl = document.getElementById(`cardName${slotNum}`);
      const inner = document.getElementById(`slot${slotNum}`).querySelector('.tarot-card-inner');

      frontEl.className = 'card-face card-front' + (c.isReversed ? ' reversed' : '');
      frontEl.innerHTML = `
        <div style="font-size:10px;font-weight:700;color:var(--primary)">No.${c.id}</div>
        <div style="font-size:12px;font-weight:900;margin:6px 0;text-align:center">${c.name.split(' ')[0]}</div>
        <div style="font-size:10px;color:var(--ink-3);text-align:center">${c.isReversed ? '逆位' : '正位'}</div>
      `;

      nameEl.textContent = `${c.name.split(' ')[0]} (${c.isReversed ? '逆位' : '正位'})`;
      inner.classList.add('flipped');

      if (idx === 2) {
        document.getElementById('submitTarotBtn').disabled = false;
        sound.playBell();
      }
    }, (idx + 1) * 450);
  });
}

// ---------------- 16. 互动法器 5：观象灵签（每日一签） ----------------
const DIVINE_LOTS = [
  { id: 1, gua: '乾为天', rating: '大吉 · 上上签', poem: '天行健兮君子强，龙腾九霄日月光。\n万里青云任展翼，此日功名自远扬。', meaning: '元亨利贞，大势所趋，百事顺畅，利于开创进取。' },
  { id: 2, gua: '坤为地', rating: '大吉 · 上上签', poem: '地势坤兮厚德载，含弘光大万物栽。\n静水深流蓄厚势，顺天承运自安泰。', meaning: '柔顺包容，蓄力待发，贵在沉稳厚德，吉星高照。' },
  { id: 11, gua: '地天泰', rating: '大吉 · 上吉签', poem: '天地交泰万象新，风和日丽草木春。\n人和事顺通大道，自有贵人顾此身。', meaning: '阴阳调和，运势大好，合作通畅，吉庆有加。' },
  { id: 14, gua: '火天大有', rating: '大吉 · 上上签', poem: '日丽中天照大千，丰盈亨通福寿全。\n德被四方生财禄，自有利禄满门延。', meaning: '盛大丰盈，顺天依时，名利双收之象。' },
  { id: 18, gua: '天风姤', rating: '中吉 · 转机签', poem: '风从虎兮云从龙，变幻无穷造化中。\n不期而遇逢胜友，携手并进见奇功。', meaning: '机缘巧合，遇贵人相助，防微虑远方可全美。' },
  { id: 24, gua: '地雷复', rating: '大吉 · 迎春签', poem: '冬去春来一阳生，枯木逢甘渐自荣。\n否极泰来运当转，前途明朗任君行。', meaning: '生机重现，旧疾退散，开启崭新转折之象。' },
  { id: 48, gua: '水风井', rating: '中平 · 修德签', poem: '源泉澄澈润无穷，勤勉汲汲见成功。\n修己安人成器度，自教名誉达天聪。', meaning: '需脚踏实地，养深积厚，切莫急功逆进。' },
  { id: 63, gua: '水火既济', rating: '中吉 · 守成签', poem: '风调雨顺事多成，初吉终乱须慎行。\n居安思危守其正，常保富贵永康宁。', meaning: '诸事小成，宜稳守中道，防范末尾懈怠。' }
];

let currentDrawnLot = null;

function initDailyLot() {
  const shakeBtn = document.getElementById('shakeLotBtn');
  const submitBtn = document.getElementById('submitLotBtn');
  const cylinder = document.getElementById('lotCylinder');

  const doShake = () => {
    cylinder.classList.add('shaking');
    sound.playChime();
    document.getElementById('lotResultBox').style.display = 'none';
    submitBtn.style.display = 'none';

    setTimeout(() => {
      cylinder.classList.remove('shaking');
      sound.playBell();
      const lot = DIVINE_LOTS[Math.floor(Math.random() * DIVINE_LOTS.length)];
      currentDrawnLot = lot;

      document.getElementById('lotRating').textContent = lot.rating;
      document.getElementById('lotTitle').textContent = `第${lot.id}签 · ${lot.gua}`;
      document.getElementById('lotPoem').innerHTML = lot.poem.replace(/\n/g, '<br>');
      document.getElementById('lotMeaning').textContent = `【签解】：${lot.meaning}`;
      document.getElementById('lotResultBox').style.display = 'block';
      submitBtn.style.display = 'inline-flex';
    }, 1200);
  };

  if (shakeBtn) shakeBtn.addEventListener('click', doShake);
  if (cylinder) cylinder.addEventListener('click', doShake);

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!currentDrawnLot) return;
      closeModal('modalLot');
      const prompt = `【观象摇签求卜】\n贫道所抽得之灵签为：\n第${currentDrawnLot.id}签 · 【${currentDrawnLot.gua}】（${currentDrawnLot.rating}）\n签诗：\n${currentDrawnLot.poem}\n签解：${currentDrawnLot.meaning}\n\n请玄机子依此签意象，结合我近期所遇事态，详批吉凶时机、心性修养与趋避之道。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 17. 互动法器 6：四柱八字排盘计算器 ----------------
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_ELEMENTS = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_ELEMENTS = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const HIDDEN_STEMS = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙戊庚', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };

function calcBaziPillars(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh] = timeStr.split(':').map(Number);

  const yearOffset = y - 1984;
  const stemYearIdx = ((yearOffset % 10) + 10) % 10;
  const branchYearIdx = ((yearOffset % 12) + 12) % 12;
  const stemYear = HEAVENLY_STEMS[stemYearIdx];
  const branchYear = EARTHLY_BRANCHES[branchYearIdx];

  const stemMonthBase = (stemYearIdx % 5) * 2 + 2;
  const stemMonthIdx = (stemMonthBase + (m - 1)) % 10;
  const branchMonthIdx = (m + 1) % 12;
  const stemMonth = HEAVENLY_STEMS[stemMonthIdx];
  const branchMonth = EARTHLY_BRANCHES[branchMonthIdx];

  const baseDate = new Date(1900, 0, 31);
  const curDate = new Date(y, m - 1, d);
  const diffDays = Math.floor((curDate - baseDate) / (1000 * 60 * 60 * 24));
  const stemDayIdx = ((diffDays % 10) + 10) % 10;
  const branchDayIdx = ((diffDays % 12) + 12) % 12;
  const stemDay = HEAVENLY_STEMS[stemDayIdx];
  const branchDay = EARTHLY_BRANCHES[branchDayIdx];

  const branchHourIdx = Math.floor(((hh + 1) % 24) / 2);
  const stemHourBase = (stemDayIdx % 5) * 2;
  const stemHourIdx = (stemHourBase + branchHourIdx) % 10;
  const stemHour = HEAVENLY_STEMS[stemHourIdx];
  const branchHour = EARTHLY_BRANCHES[branchHourIdx];

  const getDeity = (dayMaster, stem) => {
    if (dayMaster === stem) return '比肩';
    const dayElem = STEM_ELEMENTS[dayMaster];
    const stemElem = STEM_ELEMENTS[stem];
    const isSameYinYang = (HEAVENLY_STEMS.indexOf(dayMaster) % 2) === (HEAVENLY_STEMS.indexOf(stem) % 2);

    if (dayElem === stemElem) return isSameYinYang ? '比肩' : '劫财';
    if ((dayElem === '木' && stemElem === '火') || (dayElem === '火' && stemElem === '土') || (dayElem === '土' && stemElem === '金') || (dayElem === '金' && stemElem === '水') || (dayElem === '水' && stemElem === '木')) {
      return isSameYinYang ? '食神' : '伤官';
    }
    if ((dayElem === '木' && stemElem === '土') || (dayElem === '火' && stemElem === '金') || (dayElem === '土' && stemElem === '水') || (dayElem === '金' && stemElem === '木') || (dayElem === '水' && stemElem === '火')) {
      return isSameYinYang ? '偏财' : '正财';
    }
    if ((dayElem === '木' && stemElem === '金') || (dayElem === '火' && stemElem === '水') || (dayElem === '土' && stemElem === '木') || (dayElem === '金' && stemElem === '火') || (dayElem === '水' && stemElem === '土')) {
      return isSameYinYang ? '七杀' : '正官';
    }
    return isSameYinYang ? '偏印' : '正印';
  };

  return {
    year: { stem: stemYear, branch: branchYear, elem: `${STEM_ELEMENTS[stemYear]}${BRANCH_ELEMENTS[branchYear]}`, hidden: HIDDEN_STEMS[branchYear], deity: getDeity(stemDay, stemYear) },
    month: { stem: stemMonth, branch: branchMonth, elem: `${STEM_ELEMENTS[stemMonth]}${BRANCH_ELEMENTS[branchMonth]}`, hidden: HIDDEN_STEMS[branchMonth], deity: getDeity(stemDay, stemMonth) },
    day: { stem: stemDay, branch: branchDay, elem: `${STEM_ELEMENTS[stemDay]}${BRANCH_ELEMENTS[branchDay]}`, hidden: HIDDEN_STEMS[branchDay], deity: '日主' },
    hour: { stem: stemHour, branch: branchHour, elem: `${STEM_ELEMENTS[stemHour]}${BRANCH_ELEMENTS[branchHour]}`, hidden: HIDDEN_STEMS[branchHour], deity: getDeity(stemDay, stemHour) },
  };
}

function initBaziCalculator() {
  const calcBtn = document.getElementById('calcBaziBtn');
  const submitBtn = document.getElementById('submitBaziBtn');
  const dateInput = document.getElementById('baziDate');

  if (dateInput && !dateInput.value) {
    dateInput.value = '1995-06-18';
  }

  const renderBazi = () => {
    const dStr = document.getElementById('baziDate').value;
    const tStr = document.getElementById('baziTime').value || '12:00';
    if (!dStr) {
      alert('请选择出生公历日期');
      return null;
    }
    const pillars = calcBaziPillars(dStr, tStr);

    document.getElementById('stemYear').textContent = pillars.year.stem;
    document.getElementById('branchYear').textContent = pillars.year.branch;
    document.getElementById('deityYear').textContent = pillars.year.deity;
    document.getElementById('hiddenYear').textContent = pillars.year.hidden;
    document.getElementById('elemYear').textContent = pillars.year.elem;

    document.getElementById('stemMonth').textContent = pillars.month.stem;
    document.getElementById('branchMonth').textContent = pillars.month.branch;
    document.getElementById('deityMonth').textContent = pillars.month.deity;
    document.getElementById('hiddenMonth').textContent = pillars.month.hidden;
    document.getElementById('elemMonth').textContent = pillars.month.elem;

    document.getElementById('stemDay').textContent = pillars.day.stem;
    document.getElementById('branchDay').textContent = pillars.day.branch;
    document.getElementById('deityDay').textContent = '日元';
    document.getElementById('hiddenDay').textContent = pillars.day.hidden;
    document.getElementById('elemDay').textContent = pillars.day.elem;

    document.getElementById('stemHour').textContent = pillars.hour.stem;
    document.getElementById('branchHour').textContent = pillars.hour.branch;
    document.getElementById('deityHour').textContent = pillars.hour.deity;
    document.getElementById('hiddenHour').textContent = pillars.hour.hidden;
    document.getElementById('elemHour').textContent = pillars.hour.elem;

    sound.playChime();
    return pillars;
  };

  if (calcBtn) calcBtn.addEventListener('click', renderBazi);
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const pillars = renderBazi();
      if (!pillars) return;
      const gender = document.querySelector('input[name="baziGender"]:checked')?.value || '乾造';
      const city = document.getElementById('baziCity').value.trim() || '北京';
      const dStr = document.getElementById('baziDate').value;
      const tStr = document.getElementById('baziTime').value;
      const question = document.getElementById('baziQuestion').value.trim() || '详析八字格局、五行用神与2026流年吉凶';

      closeModal('modalBazi');
      const prompt = `【生辰八字精准排盘】\n缘主造化：${gender === '男' ? '乾造 (男)' : '坤造 (女)'}\n出生时间：公历 ${dStr} ${tStr}（出生地：${city}，请结合真太阳时经度校正）\n四柱干支：\n- 年柱：${pillars.year.stem}${pillars.year.branch}（十神：${pillars.year.deity}，藏干：${pillars.year.hidden}）\n- 月柱：${pillars.month.stem}${pillars.month.branch}（十神：${pillars.month.deity}，藏干：${pillars.month.hidden}）\n- 日柱：${pillars.day.stem}${pillars.day.branch}（日元：${pillars.day.stem}，藏干：${pillars.day.hidden}）\n- 时柱：${pillars.hour.stem}${pillars.hour.branch}（十神：${pillars.hour.deity}，藏干：${pillars.hour.hidden}）\n\n探查方向：${question}\n\n请玄机子按子平正宗，详推日主强弱、格局定性、用神喜忌、大运流年与关键趋避。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 18. 互动法器 7：功德电子木鱼 (新增) ----------------
function initMuyu() {
  const muyuWrap = document.getElementById('muyuIconWrap');
  const countEl = document.getElementById('muyuCount');
  const wishBtn = document.getElementById('muyuSendWishBtn');
  const arena = document.getElementById('muyuArena');

  let count = parseInt(localStorage.getItem('diviner_muyu_count') || '0', 10);
  if (countEl) countEl.textContent = count;

  const floatTexts = ['功德 +1', '静心 +1', '杂念 -1', '福慧双增', '吉星高照', '平安顺遂', '心想事成'];

  if (muyuWrap) {
    muyuWrap.addEventListener('click', (e) => {
      sound.playWood();
      count++;
      localStorage.setItem('diviner_muyu_count', String(count));
      if (countEl) countEl.textContent = count;

      const floatSpan = document.createElement('span');
      floatSpan.className = 'muyu-float-text';
      floatSpan.textContent = floatTexts[Math.floor(Math.random() * floatTexts.length)];
      floatSpan.style.left = (arena.offsetWidth / 2 - 40 + (Math.random() * 40 - 20)) + 'px';
      floatSpan.style.top = '40px';
      arena.appendChild(floatSpan);

      setTimeout(() => floatSpan.remove(), 1200);
    });
  }

  if (wishBtn) {
    wishBtn.addEventListener('click', () => {
      const wish = document.getElementById('muyuWish').value.trim() || '愿心怀清净，万事皆安';
      closeModal('modalMuyu');
      const prompt = `【功德祈福与发愿回向】\n缘主今日敲击木鱼已积【${count}】善念功德。\n发愿与祈求：「${wish}」\n\n请玄机子为我开示心法指引，赐予一段回向定心箴言。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 19. 互动法器 8：今日黄历择吉万年历 (新增) ----------------
function initAlmanac() {
  const askBtn = document.getElementById('askTodayFortuneBtn');
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  const dateBig = document.getElementById('almDateBig');
  const solarText = document.getElementById('almSolarText');

  if (dateBig) dateBig.textContent = String(d).padStart(2, '0');
  if (solarText) solarText.textContent = `${y}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日 ${days[now.getDay()]}`;

  if (askBtn) {
    askBtn.addEventListener('click', () => {
      closeModal('modalAlmanac');
      const prompt = `【今日黄历与行事择吉】\n今日公历：${y}年${m}月${d}日\n请玄机子依今日值日干支神煞，为我详批今日出行、商谈、求财与处事的吉凶时辰、避忌属相与吉利方位。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 20. 互动法器 9：周公解梦典籍向导 (新增) ----------------
function initDreamGuide() {
  const tags = document.querySelectorAll('.d-tag');
  const submitBtn = document.getElementById('submitDreamBtn');
  const detailInput = document.getElementById('dreamDetail');
  const selectedKeywords = new Set();

  tags.forEach((tag) => {
    tag.addEventListener('click', () => {
      const kw = tag.getAttribute('data-kw');
      if (selectedKeywords.has(kw)) {
        selectedKeywords.delete(kw);
        tag.classList.remove('active');
      } else {
        selectedKeywords.add(kw);
        tag.classList.add('active');
      }
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const kwList = Array.from(selectedKeywords);
      const detail = detailInput ? detailInput.value.trim() : '';
      if (!kwList.length && !detail) {
        alert('请至少勾选一个梦境意象或填写梦境情境');
        return;
      }
      closeModal('modalDream');
      const kwDesc = kwList.length ? `【梦中核心意象】：${kwList.join('、')}\n` : '';
      const prompt = `【周公解梦与原型心理推演】\n${kwDesc}【梦境详细情境】：${detail || '见上述意象，醒后感触深刻'}\n\n请玄机子融合古典《周公解梦》吉凶断法与荣格深层心理学原型隐喻，为我深度剖析潜意识提示、近期吉凶转折与心性安抚之道。`;
      sendMessage(prompt);
    });
  }
}

// ---------------- 21. 全局事件绑定与启动 ----------------
document.addEventListener('DOMContentLoaded', async () => {
  refreshIcons();
  new StarField('starCanvas');
  updateSoundUI();

  await fetchUserLocation();

  menuBtn.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  if (clearBtn) clearBtn.addEventListener('click', clearConversation);
  if (newChatBtn) newChatBtn.addEventListener('click', newChat);

  if (historyModalBtn) {
    historyModalBtn.addEventListener('click', () => {
      loadSavedChats();
      openModal('modalHistory');
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('diviner_sound_enabled', soundEnabled ? '1' : '0');
      updateSoundUI();
      if (soundEnabled) sound.playChime();
    });
  }

  if (quickArtifactBtn) quickArtifactBtn.addEventListener('click', openSidebar);
  if (dockArtifactBtn) dockArtifactBtn.addEventListener('click', openSidebar);

  document.getElementById('openIchingBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalIching'); });
  document.getElementById('openMeihuaBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalMeihua'); });
  document.getElementById('openTarotBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalTarot'); });
  document.getElementById('openXiaoliurenBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalXiaoliuren'); });
  document.getElementById('openBaziBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalBazi'); });
  document.getElementById('openLotBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalLot'); });
  document.getElementById('openAlmanacBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalAlmanac'); });
  document.getElementById('openMuyuBtn')?.addEventListener('click', () => { closeSidebar(); openModal('modalMuyu'); });

  const donationBtn = document.getElementById('donationBtn');
  const donationClose = document.getElementById('donationClose');
  const donationLater = document.getElementById('donationLater');
  const donationNever = document.getElementById('donationNever');
  const donationOk = document.getElementById('donationOk');

  if (donationBtn) donationBtn.addEventListener('click', () => openModal('donationModal'));
  if (donationClose) donationClose.addEventListener('click', () => closeModal('donationModal'));
  if (donationLater) donationLater.addEventListener('click', () => closeModal('donationModal'));
  if (donationNever) donationNever.addEventListener('click', () => { localStorage.setItem('diviner_donation_never', '1'); closeModal('donationModal'); });
  if (donationOk) donationOk.addEventListener('click', () => { localStorage.setItem('diviner_donation_last', String(Date.now())); closeModal('donationModal'); });

  document.getElementById('downloadPosterBtn')?.addEventListener('click', () => {
    const canvas = document.getElementById('posterCanvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `xuanjizi-talisman-${Date.now()}.png`;
    a.click();
  });
  document.getElementById('copyPosterTextBtn')?.addEventListener('click', () => {
    alert('已生成海报，点击“保存高清海报”即可下载保存到手机相册或电脑。');
  });

  const searchInput = document.getElementById('historySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const saved = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
      const filtered = q ? saved.filter((c) => c.title.toLowerCase().includes(q)) : saved;
      const dialogList = document.getElementById('historyDialogList');
      if (dialogList) {
        dialogList.innerHTML = filtered.length
          ? filtered.map((c) => `<div class="h-item" data-id="${c.id}"><div style="flex:1;min-width:0"><div class="h-title">${escapeHtml(c.title)}</div><div class="h-time">${escapeHtml(c.time)}</div></div></div>`).join('')
          : '<p class="empty">无匹配近问</p>';
        dialogList.querySelectorAll('.h-item').forEach((el) => {
          el.addEventListener('click', () => {
            loadChat(el.getAttribute('data-id'));
            closeModal('modalHistory');
          });
        });
      }
    });
  }

  document.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const fill = chip.getAttribute('data-fill');
      if (fill) {
        userInput.value = fill;
        handleInputChange();
        userInput.focus();
      }
    });
  });

  document.querySelectorAll('.nav-card:not(.interactive-card)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hint = btn.getAttribute('data-hint') || '';
      const label = btn.querySelector('span')?.textContent || '指引';
      closeSidebar();
      addLocalAssistantMessage(`【${label}】\n\n${hint}`);
      userInput.focus();
    });
  });

  userInput.addEventListener('input', handleInputChange);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isRequesting && (userInput.value.trim() || pendingImages.length)) {
        sendMessage();
      }
    }
  });

  if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());
  if (uploadBtn) uploadBtn.addEventListener('click', () => fileInput.click());
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });
  }
  if (clearAttach) {
    clearAttach.addEventListener('click', () => {
      pendingImages = [];
      renderAttach();
    });
  }

  const composer = document.querySelector('.composer-bar');
  if (composer) {
    ['dragenter', 'dragover'].forEach((ev) =>
      composer.addEventListener(ev, (e) => {
        e.preventDefault();
        composer.style.borderColor = 'var(--gold)';
      })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      composer.addEventListener(ev, (e) => {
        e.preventDefault();
        composer.style.borderColor = '';
      })
    );
    composer.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleFiles(files);
    });
  }

  let sx = 0, sy = 0, ex = 0, swiping = false;
  document.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    ex = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = ex - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);
    if (Math.abs(dx) > dy && Math.abs(dx) > 50) {
      if (dx > 0 && sx < 50) openSidebar();
      else if (dx < 0 && sidebar.classList.contains('active')) closeSidebar();
    }
    ex = 0;
  }, { passive: true });

  initIching();
  initMeihua();
  initXiaoliuren();
  initTarot();
  initDailyLot();
  initBaziCalculator();
  initMuyu();
  initAlmanac();
  initDreamGuide();

  loadHistory();
  loadSavedChats();
  refreshIcons();
});
