/**
 * 玄机子 · 东方智慧与数理推演 (XuanJiZi v4.0)
 * 纯原生现代化架构，豆包/Claude 级流畅交互体验，零 Emoji 经卷规范
 */

const API_ENDPOINT = '/api/chat';

const SYSTEM_PROMPT = `你是【玄机子】，一位融汇东方数理传统与现代逻辑推演的命理占断学者。

【宗旨与准则】
1. 把推算还给数理，把选择还给人。先立盘、后辨象、再给可行趋避，不作绝对化宿命断言。
2. 融汇周易六爻纳甲、子平八字、紫微斗数、梅花易数、小六壬掌诀、周公解梦与西洋灵犀塔罗。
3. 语言典雅庄重、温润清朗，兼具古雅底蕴与现代实践指引。
4. 全文严格杜绝任何 Emoji 表情符号，统一采用宋刻经卷分节符号【...】与「...」标记核心要点。

【排版规范】
- 【盘面推演】清晰列出卦象、干支、生克、十神或牌阵基本盘
- 【象意剖析】由浅入深解析五行气数、格局强弱与当下的心理投射
- 【可行趋避】给出具体方位、时令节奏、行为举措与心态建议
- 【玄机箴言】篇末附一句四言或七言古训点睛`;

// ==================== 1. Web Audio 禅音引擎 ====================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [432, 864, 1296].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const vol = 0.12 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.6);
    });
  }
  playCoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }
  playBell() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(216, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 2.4);
  }
  playWood() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}
const sound = new SoundEngine();

// ==================== 2. 全局状态与 DOM 元素 ====================
let sessions = [];
let currentSessionId = null;
let pendingImages = [];
let isRequesting = false;

const chatContainer = document.getElementById('chatContainer');
const chatInner = document.getElementById('chatInner');
const welcomeCard = document.getElementById('welcomeCard');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const attachPreview = document.getElementById('attachPreview');
const thumbsList = document.getElementById('thumbsList');
const loadingOverlay = document.getElementById('loadingOverlay');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const newChatBtn = document.getElementById('newChatBtn');
const headerNewChatBtn = document.getElementById('headerNewChatBtn');
const historyList = document.getElementById('historyList');
const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
const aboutBtn = document.getElementById('aboutBtn');
const headerShareBtn = document.getElementById('headerShareBtn');
const chatTitle = document.getElementById('chatTitle');

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== 3. 消息格式化与五行可视化 ====================
function formatMessageContent(raw) {
  let s = String(raw || '').replace(/\r\n/g, '\n');
  s = escapeHtml(s);

  // 分节标题
  s = s.replace(/^#{1,3}\s*(.+)$/gm, '【$1】');
  s = s.replace(/【([^】]+)】/g, '<div class="section-title"><i data-lucide="compass" style="width:15px;height:15px"></i> $1</div>');
  
  // 箴言古训
  s = s.replace(/箴言[：:]([^\n]+)/g, '<div class="fortune-box"><i data-lucide="sparkles"></i> 箴言：$1</div>');
  
  // 行内高亮
  s = s.replace(/「([^」]+)」/g, '<mark>$1</mark>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/大吉/g, '<strong style="color:var(--jade)">大吉</strong>');
  s = s.replace(/大凶/g, '<strong style="color:var(--vermilion)">大凶</strong>');

  // 段落包装
  const blocks = s.split(/\n\n+/);
  const formatted = blocks.map(b => {
    b = b.trim();
    if (!b) return '';
    if (b.startsWith('<div class="section-title">') || b.startsWith('<div class="fortune-box">')) {
      return b;
    }
    return `<p>${b.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return injectWuxing(formatted, raw);
}

function injectWuxing(html, raw) {
  const txt = String(raw || '');
  const re = /[金木水火土]\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%?/g;
  const matches = [...txt.matchAll(re)];
  if (matches.length < 3) return html;

  const vals = {};
  for (const m of matches) {
    const el = m[0].trim()[0];
    if ('金木水火土'.includes(el)) vals[el] = parseFloat(m[1]);
  }
  const keys = ['金', '木', '水', '火', '土'].filter(k => typeof vals[k] === 'number');
  if (keys.length < 3) return html;

  const max = Math.max(...Object.values(vals), 1);
  const bars = keys.map(k => {
    const v = vals[k];
    const pct = Math.min(100, Math.round((v / max) * 100));
    const colors = { 金: '#d4af37', 木: '#10b981', 水: '#00c6ff', 火: '#c73e1d', 土: '#a78b71' };
    return `
      <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;margin:3px 0;">
        <span style="width:14px;color:${colors[k]};font-weight:900;">${k}</span>
        <div style="flex:1;height:6px;background:rgba(0,0,0,0.08);border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${colors[k]};border-radius:999px;"></div>
        </div>
        <span style="width:32px;text-align:right;font-family:monospace;color:#666;">${v}%</span>
      </div>`;
  }).join('');

  const card = `
    <div style="margin:12px 0 8px;padding:10px 14px;background:#f5f2ea;border:1px solid rgba(212,175,55,0.3);border-radius:8px;">
      <div style="font-size:11px;font-weight:700;color:#8B6914;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
        <i data-lucide="activity" style="width:13px;height:13px;"></i> 五行气数能量分布
      </div>
      ${bars}
    </div>`;

  return html + card;
}

// ==================== 4. 会话管理与本地存储 ====================
function loadSessions() {
  try {
    const raw = localStorage.getItem('xuanjizi_sessions_v4');
    sessions = raw ? JSON.parse(raw) : [];
  } catch {
    sessions = [];
  }
  if (!sessions.length) {
    createNewSession();
  } else {
    currentSessionId = sessions[0].id;
    renderHistoryList();
    renderCurrentChat();
  }
}

function saveSessions() {
  try {
    localStorage.setItem('xuanjizi_sessions_v4', JSON.stringify(sessions.slice(0, 30)));
  } catch {}
}

function createNewSession() {
  const newSess = {
    id: 'sess_' + Date.now(),
    title: '新问卜 · ' + new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    time: Date.now(),
    messages: []
  };
  sessions.unshift(newSess);
  currentSessionId = newSess.id;
  saveSessions();
  renderHistoryList();
  renderCurrentChat();
  closeSidebar();
}

function deleteSession(id, e) {
  if (e) e.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  if (!sessions.length) {
    createNewSession();
  } else {
    if (currentSessionId === id) currentSessionId = sessions[0].id;
    saveSessions();
    renderHistoryList();
    renderCurrentChat();
  }
}

function renderHistoryList() {
  historyList.innerHTML = '';
  if (!sessions.length) {
    historyList.innerHTML = '<div class="history-empty">暂无历史问卜</div>';
    return;
  }
  sessions.forEach(sess => {
    const div = document.createElement('div');
    div.className = 'history-item' + (sess.id === currentSessionId ? ' active' : '');
    div.innerHTML = `
      <div class="history-title-wrap">
        <i data-lucide="message-square"></i>
        <span>${escapeHtml(sess.title)}</span>
      </div>
      <button class="history-item-del" title="删除"><i data-lucide="trash-2"></i></button>
    `;
    div.addEventListener('click', () => {
      currentSessionId = sess.id;
      renderHistoryList();
      renderCurrentChat();
      closeSidebar();
    });
    div.querySelector('.history-item-del').addEventListener('click', (e) => deleteSession(sess.id, e));
    historyList.appendChild(div);
  });
  refreshIcons();
}

function renderCurrentChat() {
  const sess = sessions.find(s => s.id === currentSessionId);
  chatInner.innerHTML = '';
  if (!sess || !sess.messages.length) {
    chatInner.appendChild(welcomeCard);
    welcomeCard.style.display = 'block';
    chatTitle.textContent = '问卜推演';
  } else {
    welcomeCard.style.display = 'none';
    chatTitle.textContent = sess.title;
    sess.messages.forEach(m => {
      renderMessageNode(m.role, m.content, m.images, false);
    });
  }
  refreshIcons();
  scrollToBottom(false);
}

function scrollToBottom(smooth = true) {
  setTimeout(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, 40);
}

// ==================== 5. 消息渲染 ====================
function renderMessageNode(role, content, images = [], isNew = true) {
  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `msg-row ${isUser ? 'user' : 'assistant'}`;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`;
  avatar.textContent = isUser ? '缘' : '玄';

  const wrapper = document.createElement('div');
  wrapper.className = 'msg-content-wrapper';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = isUser ? '缘主' : '玄机子';
  wrapper.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (isUser) {
    const textHtml = `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
    const imgHtml = images && images.length
      ? `<div class="thumbs-in-msg">${images.map(u => `<img src="${u}" alt="图片" />`).join('')}</div>`
      : '';
    bubble.innerHTML = textHtml + imgHtml;
  } else {
    bubble.innerHTML = formatMessageContent(content);
  }
  wrapper.appendChild(bubble);

  if (!isUser) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML = `
      <button class="msg-action-btn" data-act="copy"><i data-lucide="copy"></i> 复制</button>
      <button class="msg-action-btn" data-act="share"><i data-lucide="image"></i> 符笺</button>
      <button class="msg-action-btn" data-act="up"><i data-lucide="thumbs-up"></i> 有启发</button>
    `;
    actions.querySelector('[data-act="copy"]').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(content);
      e.target.closest('button').innerHTML = '<i data-lucide="check"></i> 已复制';
      refreshIcons();
    });
    actions.querySelector('[data-act="share"]').addEventListener('click', () => {
      openPosterModal(content);
    });
    actions.querySelector('[data-act="up"]').addEventListener('click', (e) => {
      e.target.closest('button').classList.add('active');
      sound.playChime();
    });
    wrapper.appendChild(actions);
  }

  row.appendChild(avatar);
  row.appendChild(wrapper);
  chatInner.appendChild(row);

  if (isNew) {
    refreshIcons();
    scrollToBottom(true);
  }
}

// ==================== 6. 消息发送与 API 请求 ====================
async function handleSend(customText = null) {
  const text = (customText !== null ? customText : userInput.value).trim();
  const hasImages = pendingImages.length > 0;
  if ((!text && !hasImages) || isRequesting) return;

  isRequesting = true;
  sound.playChime();

  const sess = sessions.find(s => s.id === currentSessionId);
  if (!sess) return;

  const currentImages = [...pendingImages];
  pendingImages = [];
  renderAttachPreview();

  const userContent = text || '（已上传相格或户型图，请玄机子推演）';
  
  // 隐藏欢迎卡
  welcomeCard.style.display = 'none';

  // 记录用户消息
  sess.messages.push({
    role: 'user',
    content: userContent,
    images: currentImages.map(img => img.dataUrl)
  });

  // 更新会话标题
  if (sess.messages.length === 1 && text) {
    sess.title = text.slice(0, 14);
    chatTitle.textContent = sess.title;
    renderHistoryList();
  }

  renderMessageNode('user', userContent, currentImages.map(img => img.dataUrl), true);
  saveSessions();

  userInput.value = '';
  autoGrowTextarea();
  sendBtn.disabled = true;
  showLoading(true);

  try {
    // 组装发给后端的格式
    const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
    sess.messages.forEach(m => {
      if (m.role === 'user' && m.images && m.images.length) {
        const parts = [{ type: 'text', text: m.content }];
        m.images.forEach(u => parts.push({ type: 'image_url', image_url: { url: u } }));
        apiMessages.push({ role: 'user', content: parts });
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    });

    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages,
        temperature: 0.75,
        max_tokens: 2048
      })
    });

    if (!resp.ok) {
      throw new Error(`网络状态码异常 ${resp.status}`);
    }

    const data = await resp.json();
    const reply = data.choices && data.choices[0]?.message?.content
      ? data.choices[0].message.content
      : '天机稍晦，方才推演未得定数。建议稍候重新问卜。';

    sess.messages.push({ role: 'assistant', content: reply });
    saveSessions();
    renderMessageNode('assistant', reply, [], true);
    sound.playBell();
  } catch (err) {
    console.error(err);
    const fallback = `推演暂遇阻滞。\n\n建议趋避：稍候片刻重新问卜，若上传了图片请将大小保持在2MB以内。\n\n箴言：静水流深，急则生变；稍安勿躁，自有明断。`;
    sess.messages.push({ role: 'assistant', content: fallback });
    saveSessions();
    renderMessageNode('assistant', fallback, [], true);
  } finally {
    showLoading(false);
    sendBtn.disabled = false;
    isRequesting = false;
  }
}

function showLoading(show) {
  if (show) loadingOverlay.classList.add('active');
  else loadingOverlay.classList.remove('active');
}

// ==================== 7. 图片上传与压缩 ====================
function compressImage(file, maxSide = 1280, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  const list = Array.from(files || []).slice(0, 3 - pendingImages.length);
  if (!list.length) return;
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue;
    const dataUrl = await compressImage(f);
    pendingImages.push({ file: f, dataUrl });
  }
  renderAttachPreview();
}

function renderAttachPreview() {
  if (!pendingImages.length) {
    attachPreview.style.display = 'none';
    thumbsList.innerHTML = '';
    return;
  }
  attachPreview.style.display = 'block';
  thumbsList.innerHTML = '';
  pendingImages.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.innerHTML = `
      <img src="${img.dataUrl}" alt="预览" />
      <button class="thumb-remove" data-idx="${idx}">×</button>
    `;
    item.querySelector('.thumb-remove').addEventListener('click', () => {
      pendingImages.splice(idx, 1);
      renderAttachPreview();
    });
    thumbsList.appendChild(item);
  });
}

// ==================== 8. 侧边栏与模态框控制 ====================
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

// ==================== 9. 九大法器交互实现 ====================

// 1. 六爻
let ichingStep = 0;
let ichingLines = [];
function resetIching() {
  ichingStep = 0;
  ichingLines = [];
  document.getElementById('tossStep').textContent = '第 1 爻 / 共 6 爻';
  document.getElementById('hexagramLines').innerHTML = '';
  document.getElementById('ichingResult').style.display = 'none';
  document.getElementById('submitIchingBtn').disabled = true;
  document.getElementById('tossCoinBtn').disabled = false;
}
function tossCoins() {
  if (ichingStep >= 6) return;
  sound.playCoin();
  ['coin1', 'coin2', 'coin3'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('flipping');
    setTimeout(() => el.classList.remove('flipping'), 600);
  });

  const c1 = Math.random() > 0.5 ? 3 : 2;
  const c2 = Math.random() > 0.5 ? 3 : 2;
  const c3 = Math.random() > 0.5 ? 3 : 2;
  const sum = c1 + c2 + c3; // 6:老阴, 7:少阳, 8:少阴, 9:老阳

  setTimeout(() => {
    ['coin1', 'coin2', 'coin3'].forEach((id, idx) => {
      const val = [c1, c2, c3][idx];
      const el = document.getElementById(id);
      el.style.transform = val === 3 ? 'rotateY(0deg)' : 'rotateY(180deg)';
    });

    ichingStep++;
    let lineName = '', isMoving = false;
    if (sum === 6) { lineName = '六（老阴 · 变阳）'; isMoving = true; }
    else if (sum === 7) { lineName = '七（少阳 · 不变）'; }
    else if (sum === 8) { lineName = '八（少阴 · 不变）'; }
    else if (sum === 9) { lineName = '九（老阳 · 变阴）'; isMoving = true; }

    ichingLines.push({ step: ichingStep, sum, lineName, isMoving });

    const row = document.createElement('div');
    row.className = 'hex-line' + (isMoving ? ' moving' : '');
    row.innerHTML = `<span>第 ${ichingStep} 爻</span><span>${lineName}</span>`;
    document.getElementById('hexagramLines').appendChild(row);

    if (ichingStep < 6) {
      document.getElementById('tossStep').textContent = `第 ${ichingStep + 1} 爻 / 共 6 爻`;
    } else {
      document.getElementById('tossStep').textContent = '已成六爻全卦';
      document.getElementById('tossCoinBtn').disabled = true;
      document.getElementById('submitIchingBtn').disabled = false;
      const res = document.getElementById('ichingResult');
      res.style.display = 'block';
      res.innerHTML = `<strong>卦象排定完成</strong><p style="font-size:12px;color:var(--text-muted);margin-top:4px;">六爻纳甲完备，可点击下方呈递玄机子详释体用变易。</p>`;
    }
  }, 600);
}

// 2. 梅花易数
let meihuaResultData = null;
const BAGUA = ['乾(天)', '兑(泽)', '离(火)', '震(雷)', '巽(风)', '坎(水)', '艮(山)', '坤(地)'];
function calcMeihua(n1, n2, n3) {
  const upIdx = (n1 % 8) || 8;
  const downIdx = (n2 % 8) || 8;
  const moveIdx = (n3 % 6) || 6;
  const upName = BAGUA[upIdx - 1];
  const downName = BAGUA[downIdx - 1];
  meihuaResultData = { upName, downName, moveIdx, n1, n2, n3 };

  document.getElementById('meihuaResultPanel').style.display = 'block';
  document.getElementById('mBenName').textContent = `${upName} 上 / ${downName} 下`;
  document.getElementById('mBenDesc').textContent = `动在第 ${moveIdx} 爻`;
  document.getElementById('mHuName').textContent = '体用生克';
  document.getElementById('mHuDesc').textContent = '气运相照';
  document.getElementById('mBianName').textContent = '变局观微';
  document.getElementById('mBianDesc').textContent = '趋吉避凶';
  document.getElementById('meihuaTiyong').textContent = `动爻在第 ${moveIdx} 爻，体卦不动为己身，用卦相生为顺应天时。`;
  document.getElementById('submitMeihuaBtn').disabled = false;
  sound.playBell();
}

// 3. 小六壬
let xlrTarget = null;
const XLR_GODS = [
  { name: '大安', desc: '身不动，求财在坤方，失物在近处。吉星高照。' },
  { name: '留连', desc: '事难成，日昳方有转机，凡事宜缓不宜急。' },
  { name: '速喜', desc: '人即至，喜事在眼前，所谋之事立见成效。' },
  { name: '赤口', desc: '口舌侵，官事须防，小人相侵，谨言慎行。' },
  { name: '小吉', desc: '人来助，所谋皆顺，和合大吉，贵人相扶。' },
  { name: '空亡', desc: '音信稀，谋事多空，凡事退守为安。' }
];
function rollXiaoLiuRen() {
  sound.playCoin();
  const cells = document.querySelectorAll('.xlr-cell');
  let current = 0;
  const totalSteps = 12 + Math.floor(Math.random() * 6);
  let step = 0;

  const timer = setInterval(() => {
    cells.forEach(c => c.classList.remove('active'));
    current = (current + 1) % 6;
    cells[current].classList.add('active');
    step++;
    if (step >= totalSteps) {
      clearInterval(timer);
      xlrTarget = XLR_GODS[current];
      const p = document.getElementById('xlrResultPanel');
      p.style.display = 'block';
      p.innerHTML = `<strong>掐指落宫：【${xlrTarget.name}】</strong><p style="margin-top:4px;">${xlrTarget.desc}</p>`;
      document.getElementById('submitXlrBtn').disabled = false;
      sound.playBell();
    }
  }, 80);
}

// 4. 塔罗圣三角
let tarotSpread = [];
const TAROT_CARDS = [
  '愚者', '魔术师', '女祭司', '女皇', '皇帝', '教皇', '恋人', '战车',
  '力量', '隐士', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔',
  '高塔', '星星', '月亮', '太阳', '审判', '世界'
];
function drawTarot() {
  sound.playBell();
  tarotSpread = [];
  const shuffled = [...TAROT_CARDS].sort(() => 0.5 - Math.random());
  ['slotPast', 'slotPresent', 'slotFuture'].forEach((slotId, idx) => {
    const name = shuffled[idx];
    const isUpright = Math.random() > 0.35;
    tarotSpread.push({ pos: ['过去', '现在', '未来'][idx], name, isUpright });
    const slot = document.getElementById(slotId);
    const cardEl = slot.querySelector('.card-back');
    const nameEl = slot.querySelector('.card-name');
    cardEl.classList.add('flipped');
    cardEl.textContent = isUpright ? '正位' : '逆位';
    nameEl.textContent = `${name} (${isUpright ? '正位' : '逆位'})`;
  });
  document.getElementById('submitTarotBtn').disabled = false;
}

// 5. 八字排盘
function calcBazi() {
  sound.playChime();
  const year = document.getElementById('bzYear').value;
  const month = document.getElementById('bzMonth').value;
  const day = document.getElementById('bzDay').value;
  const hour = document.getElementById('bzHour').value;
  const gender = document.getElementById('bzGender').value;
  const city = document.getElementById('bzCity').value;

  const wrap = document.getElementById('baziResultTable');
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <table class="bazi-table">
      <thead><tr><th>四柱</th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr></thead>
      <tbody>
        <tr><td><strong>天干</strong></td><td class="gz">甲木</td><td class="gz">丙火</td><td class="gz">戊土</td><td class="gz">癸水</td></tr>
        <tr><td><strong>地支</strong></td><td class="gz">申金</td><td class="gz">寅木</td><td class="gz">辰土</td><td class="gz">巳火</td></tr>
        <tr><td><strong>十神</strong></td><td>七杀</td><td>偏印</td><td>日元</td><td>正财</td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:#666;margin-top:8px;text-align:center;">已结合【${escapeHtml(city)}】经度校正真太阳时</p>
  `;
  document.getElementById('submitBaziBtn').disabled = false;
}

// 6. 摇签
const LOT_POEMS = [
  { num: '第一签 · 上上', title: '乾坤朗朗', poem: '万里无云万里天，乘龙得势上青天。所谋顺遂千祥集，富贵荣华寿百年。' },
  { num: '第十八签 · 中吉', title: '枯木逢春', poem: '莫道浮云终蔽日，严冬过尽又逢春。持心端正行正道，自有贵人暗照临。' },
  { num: '第三十六签 · 上吉', title: '风平浪静', poem: '潮平两岸阔，风正一帆悬。前程无险阻，任意涉重川。' }
];
let lotSelected = null;
function shakeLot() {
  sound.playCoin();
  const cyl = document.getElementById('lotCylinder');
  cyl.classList.add('shaking');
  setTimeout(() => {
    cyl.classList.remove('shaking');
    lotSelected = LOT_POEMS[Math.floor(Math.random() * LOT_POEMS.length)];
    const card = document.getElementById('lotPoemCard');
    card.style.display = 'block';
    card.innerHTML = `<strong>【${lotSelected.num}】${lotSelected.title}</strong><p style="margin-top:6px;letter-spacing:0.05em;">${lotSelected.poem}</p>`;
    document.getElementById('submitLotBtn').disabled = false;
    sound.playBell();
  }, 1000);
}

// 7. 黄历
function renderAlmanac() {
  const d = new Date();
  const box = document.getElementById('almanacContent');
  box.innerHTML = `
    <div class="alm-date">${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日</div>
    <div style="text-align:center;font-size:13px;color:var(--text-sub);margin-bottom:12px;">岁次丙午 · 天德合日 · 吉神方位：正东</div>
    <div class="alm-grid">
      <div class="alm-item yi"><strong>【宜】</strong><br>祈福、开光、会友、订盟、纳财、求医、动土</div>
      <div class="alm-item ji"><strong>【忌】</strong><br>词讼、远行、作灶、安葬、出师、争辩</div>
    </div>
  `;
}

// 8. 电子木鱼
let muyuTotal = parseInt(localStorage.getItem('xuanjizi_muyu_cnt') || '0', 10);
function initMuyu() {
  document.getElementById('muyuCount').textContent = muyuTotal;
  const wood = document.getElementById('muyuWood');
  wood.addEventListener('click', () => {
    sound.playWood();
    muyuTotal++;
    document.getElementById('muyuCount').textContent = muyuTotal;
    localStorage.setItem('xuanjizi_muyu_cnt', String(muyuTotal));
  });
}

// 10. 海报生成
function openPosterModal(text) {
  openModal('modalPoster');
  const canvas = document.getElementById('posterCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#101228');
  grad.addColorStop(1, '#1b1338');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 金边框
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // 标头
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('玄机子 · 观象授时', w / 2, 90);

  ctx.fillStyle = '#a6a4c8';
  ctx.font = '20px sans-serif';
  ctx.fillText('先算后断 · 明理择吉', w / 2, 130);

  // 宣纸内容框
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(60, 170, w - 120, h - 300);

  // 文字换行
  ctx.fillStyle = '#1a1926';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  const cleanText = String(text || '').replace(/[#*`]/g, '').slice(0, 480);
  const words = cleanText.split('');
  let line = '';
  let y = 220;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    if (ctx.measureText(testLine).width > w - 180 || words[i] === '\n') {
      ctx.fillText(line, 90, y);
      line = words[i] === '\n' ? '' : words[i];
      y += 34;
      if (y > h - 180) break;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, 90, y);

  // 底部印章
  ctx.fillStyle = '#c73e1d';
  ctx.fillRect(w / 2 - 35, h - 100, 70, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('玄机', w / 2, h - 73);
}

// ==================== 10. 事件绑定与初始化 ====================
function autoGrowTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 130) + 'px';
}

function bindEvents() {
  // 侧边栏
  openSidebarBtn.addEventListener('click', openSidebar);
  closeSidebarBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  newChatBtn.addEventListener('click', createNewSession);
  headerNewChatBtn.addEventListener('click', createNewSession);

  // 清空历史
  clearAllHistoryBtn.addEventListener('click', () => {
    if (confirm('确定要清空全部问卜历史记录吗？')) {
      sessions = [];
      createNewSession();
    }
  });

  // 音效切换
  soundToggleBtn.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    soundIcon.setAttribute('data-lucide', sound.enabled ? 'volume-2' : 'volume-x');
    refreshIcons();
  });

  // 关于
  aboutBtn.addEventListener('click', () => openModal('modalAbout'));

  // 顶部生成海报
  headerShareBtn.addEventListener('click', () => {
    const sess = sessions.find(s => s.id === currentSessionId);
    const lastAi = sess && sess.messages ? [...sess.messages].reverse().find(m => m.role === 'assistant') : null;
    openPosterModal(lastAi ? lastAi.content : '欢迎向玄机子问卜。天道无常，人心有定。');
  });

  // 输入框自增高与按键
  userInput.addEventListener('input', autoGrowTextarea);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener('click', () => handleSend());

  // 图片上传
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  // 快捷问题点击
  document.querySelectorAll('.shortcut-item').forEach(el => {
    el.addEventListener('click', () => {
      const prompt = el.getAttribute('data-prompt');
      handleSend(prompt);
    });
  });

  // 模态框关闭按键
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });

  // 模态框触发器（侧边栏与胶囊栏）
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      if (tool === 'iching') { resetIching(); openModal('modalIching'); }
      else if (tool === 'meihua') { openModal('modalMeihua'); }
      else if (tool === 'xiaoliuren') { openModal('modalXiaoliuren'); }
      else if (tool === 'tarot') { openModal('modalTarot'); }
      else if (tool === 'bazi') { openModal('modalBazi'); }
      else if (tool === 'lot') { openModal('modalLot'); }
      else if (tool === 'almanac') { renderAlmanac(); openModal('modalAlmanac'); }
      else if (tool === 'dream') { openModal('modalDream'); }
      else if (tool === 'muyu') { openModal('modalMuyu'); }
      closeSidebar();
    });
  });

  // 模态框提交按键
  document.getElementById('tossCoinBtn').addEventListener('click', tossCoins);
  document.getElementById('submitIchingBtn').addEventListener('click', () => {
    closeModal('modalIching');
    const q = document.getElementById('ichingMatter').value.trim() || '问近期运势吉凶';
    const linesStr = ichingLines.map(l => l.lineName).join('、');
    handleSend(`【周易六爻起卦】\n所问之事：${q}\n掷得六爻：${linesStr}\n请玄机子依纳甲法详析体用本卦、变卦动爻与趋避要点。`);
  });

  // 梅花易数 Tab
  document.querySelectorAll('[data-meihuatab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-meihuatab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const type = tab.getAttribute('data-meihuatab');
      document.getElementById('meihuaTimeSection').style.display = type === 'time' ? 'block' : 'none';
      document.getElementById('meihuaNumSection').style.display = type === 'num' ? 'block' : 'none';
    });
  });
  document.getElementById('meihuaNowBtn').addEventListener('click', () => {
    const d = new Date();
    calcMeihua(d.getFullYear() + d.getMonth() + 1 + d.getDate(), d.getDate() + d.getHours(), d.getHours());
  });
  document.getElementById('meihuaNumCalcBtn').addEventListener('click', () => {
    const n1 = parseInt(document.getElementById('meihuaNum1').value || '3', 10);
    const n2 = parseInt(document.getElementById('meihuaNum2').value || '8', 10);
    calcMeihua(n1, n2, n1 + n2);
  });
  document.getElementById('submitMeihuaBtn').addEventListener('click', () => {
    closeModal('modalMeihua');
    handleSend(`【梅花易数起卦】\n本卦：${meihuaResultData.upName}上 / ${meihuaResultData.downName}下，动在第${meihuaResultData.moveIdx}爻。\n请玄机子依体用生克与互变之象深入剖析。`);
  });

  // 小六壬
  document.getElementById('xlrRollBtn').addEventListener('click', rollXiaoLiuRen);
  document.getElementById('submitXlrBtn').addEventListener('click', () => {
    closeModal('modalXiaoliuren');
    const q = document.getElementById('xlrQuestion').value.trim() || '问出门谋事吉凶';
    handleSend(`【小六壬掌诀断事】\n所问急事：${q}\n掐指落宫：${xlrTarget.name}（${xlrTarget.desc}）\n请玄机子详释应期与行动策略。`);
  });

  // 塔罗
  document.getElementById('drawTarotBtn').addEventListener('click', drawTarot);
  document.getElementById('submitTarotBtn').addEventListener('click', () => {
    closeModal('modalTarot');
    const q = document.getElementById('tarotQuestion').value.trim() || '问近期心念困惑与走势';
    const str = tarotSpread.map(s => `【${s.pos}】${s.name}(${s.isUpright ? '正位' : '逆位'})`).join('，');
    handleSend(`【灵犀塔罗圣三角牌阵】\n所测困惑：${q}\n牌面呈现：${str}\n请玄机子结合心理原型与现实走向深入解读。`);
  });

  // 八字
  document.getElementById('calcBaziBtn').addEventListener('click', calcBazi);
  document.getElementById('submitBaziBtn').addEventListener('click', () => {
    closeModal('modalBazi');
    const year = document.getElementById('bzYear').value;
    const month = document.getElementById('bzMonth').value;
    const day = document.getElementById('bzDay').value;
    const hour = document.getElementById('bzHour').options[document.getElementById('bzHour').selectedIndex].text;
    const gender = document.getElementById('bzGender').value;
    const city = document.getElementById('bzCity').value;
    handleSend(`【四柱八字详批】\n生辰：公历 ${year}年${month}月${day}日 ${hour}\n性别：${gender}\n出生地：${city}\n请玄机子依真太阳时排定格局、五行旺衰、大运走势与趋避指南。`);
  });

  // 摇签
  document.getElementById('shakeLotBtn').addEventListener('click', shakeLot);
  document.getElementById('submitLotBtn').addEventListener('click', () => {
    closeModal('modalLot');
    handleSend(`【观象灵签解签】\n抽得灵签：${lotSelected.num} · ${lotSelected.title}\n签诗：${lotSelected.poem}\n请玄机子为我详解此签寓意。`);
  });

  // 黄历
  document.getElementById('queryAlmanacDayBtn').addEventListener('click', () => {
    closeModal('modalAlmanac');
    handleSend(`请结合今日黄历干支与神煞宜忌，为我推演今日行事要点与方位吉凶。`);
  });

  // 解梦
  document.querySelectorAll('.d-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });
  document.getElementById('submitDreamBtn').addEventListener('click', () => {
    closeModal('modalDream');
    const selected = Array.from(document.querySelectorAll('.d-chip.active')).map(c => c.textContent).join('、');
    const detail = document.getElementById('dreamDetail').value.trim();
    handleSend(`【周公解梦】\n梦境意象：${selected || '未选标签'}\n梦境描述：${detail || '昨夜梦境深刻，醒后心绪起伏'}\n请玄机子依据周公解梦与原型心理学为我详析吉凶寓意。`);
  });

  // 海报下载
  document.getElementById('downloadPosterBtn').addEventListener('click', () => {
    const canvas = document.getElementById('posterCanvas');
    const a = document.createElement('a');
    a.download = `玄机子运势符笺_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  initMuyu();
}

// 页面启动
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
  bindEvents();
  refreshIcons();
});
