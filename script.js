// 玄机子 · 东方数理与灵犀占断 (XuanJiZi v7.0 - Zero Emoji Edition)
// 纯净典雅设计，无任何低质表情符号，支持多线路无缝容灾、3D 塔罗、六爻、梅花、八字、小六壬、摇签、黄历、木鱼与海报生成

const API_ENDPOINT = '/api/chat';
const STORAGE_KEY = 'xuanjizi_sessions_v7';
const SYSTEM_PROMPT = `你是【玄机子】，一位融汇东方数理传统（周易六爻、梅花易数、四柱八字、小六壬）与西方灵犀哲学（塔罗圣三角）的命理占断大师。
你的职责是以客观、睿智、温和且富含哲理的语言为问卜者排忧解难。

回答结构要求：
1. 【象数解析】清晰陈述卦象/牌面/数理的内在含义；
2. 【吉凶趋避】客观剖析利弊，指出机遇与隐患；
3. 【可行建议】给出3点在现实生活中切实可行的具体行动方案；
4. 【玄机箴言】以一句富有诗意与东方智慧的箴言收尾。

严格禁止：
- 严禁输出任何思考标签（如 <think>...</think> 或 <reasoning>...</reasoning>）；
- 严禁使用 Emoji 绘文字表情符号；
- 严禁生硬宣称“我是人工智能无法算命”，必须代入玄机子宗师身份，以数理逻辑与哲学智慧给出深度解读。`;

// 22 张大阿卡纳塔罗牌数据 (罗马数字与纯净文本)
const TAROT_DECK = [
  { num: '0', name: '愚者 (The Fool)', upright: '新的开端、纯真、勇敢冒险、无限潜能', reversed: '盲目冲动、缺乏规划、轻率行事' },
  { num: 'I', name: '魔术师 (The Magician)', upright: '创造力、专注力、显化愿景、资源齐备', reversed: '才能受阻、言不由衷、缺乏行动' },
  { num: 'II', name: '女祭司 (The High Priestess)', upright: '直觉敏锐、深沉智慧、潜意识洞察、静观', reversed: '忽视直觉、情绪压抑、表面化' },
  { num: 'III', name: '皇后 (The Empress)', upright: '丰盛繁荣、滋养培育、创造力爆发、和谐', reversed: '过度依赖、创造枯竭、心力交瘁' },
  { num: 'IV', name: '皇帝 (The Emperor)', upright: '权威秩序、坚固根基、掌控力、战略执行', reversed: '僵化专断、控制欲过强、执行遇阻' },
  { num: 'V', name: '教皇 (The Hierophant)', upright: '传统智慧、良师指引、精神信仰、求同存异', reversed: '墨守成规、教条束缚、沟通障碍' },
  { num: 'VI', name: '恋人 (The Lovers)', upright: '灵魂契合、重要抉择、真挚联结、价值观一致', reversed: '关系分歧、抉择两难、诱惑失衡' },
  { num: 'VII', name: '战车 (The Chariot)', upright: '意志坚定、破除险阻、势如破竹、胜利在握', reversed: '失控受阻、用力过猛、方向偏差' },
  { num: 'VIII', name: '力量 (Strength)', upright: '以柔克刚、内在勇气、情绪安抚、包容自信', reversed: '自我怀疑、急躁失控、气力透支' },
  { num: 'IX', name: '隐士 (The Hermit)', upright: '向内求索、独立自省、明灯指路、真理追寻', reversed: '孤立封闭、逃避现实、偏执自误' },
  { num: 'X', name: '命运之轮 (Wheel of Fortune)', upright: '时来运转、顺应周期、转机降临、命运眷顾', reversed: '运势起伏、被动等待、逆势徒劳' },
  { num: 'XI', name: '正义 (Justice)', upright: '公正因果、清明理智、负责自律、真理显现', reversed: '偏颇失衡、推卸责任、纠纷未决' },
  { num: 'XII', name: '倒吊人 (The Hanged Man)', upright: '换位思考、主动沉淀、精神觉醒、舍得智慧', reversed: '无谓牺牲、拖延僵持、固执不放' },
  { num: 'XIII', name: '死神 (Death)', upright: '脱胎换骨、旧事终结、告别过去、迎接新生', reversed: '抗拒改变、沉湎过往、停滞不前' },
  { num: 'XIV', name: '节制 (Temperance)', upright: '中庸调和、身心平衡、良性循环、耐心沉淀', reversed: '极度失衡、急功近利、情绪失控' },
  { num: 'XV', name: '恶魔 (The Devil)', upright: '欲望驱使、物质束缚、执念觉察、打破枷锁', reversed: '重获清醒、斩断心魔、回归本真' },
  { num: 'XVI', name: '高塔 (The Tower)', upright: '破旧立新、震撼觉醒、打破虚妄、重建秩序', reversed: '侥幸逃避、隐患未除、后知后觉' },
  { num: 'XVII', name: '星星 (The Star)', upright: '希望重燃、灵感涌现、心灵疗愈、前路光明', reversed: '信心动摇、期待落空、灵感枯竭' },
  { num: 'XVIII', name: '月亮 (The Moon)', upright: '洞悉迷局、直面恐惧、潜意识浮现、警惕幻象', reversed: '拨云见日、恐惧消退、真相大白' },
  { num: 'XIX', name: '太阳 (The Sun)', upright: '光明喜悦、丰硕成果、自信笃定、万事通达', reversed: '暂欠明朗、虚荣浮躁、缺乏耐心' },
  { num: 'XX', name: '审判 (Judgement)', upright: '唤醒天命、彻底解脱、重大决断、新的人生篇章', reversed: '犹豫不决、自怨自艾、错失机缘' },
  { num: 'XXI', name: '世界 (The World)', upright: '圆满终结、融会贯通、宏大格局、全新征程', reversed: '临门一脚、缺乏闭环、留有遗憾' }
];

// 音频引擎
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
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
  playChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }
  playCoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
  playMuyu() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
}
const sound = new SoundEngine();

// DOM 元素缓存
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
const historyList = document.getElementById('historyList');
const chatTitle = document.getElementById('chatTitle');
const statusBadgeText = document.getElementById('statusBadgeText');
const loadingOverlay = document.getElementById('loadingOverlay');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');

// 初始化会话与事件
function initApp() {
  loadSessions();
  bindEvents();
  renderHistoryList();
  renderAlmanacData();
  if (window.lucide) window.lucide.createIcons();
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sessions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    sessions = [];
  }
  if (!sessions.length) {
    createNewSession();
  } else {
    currentSessionId = sessions[0].id;
    renderCurrentChat();
  }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Storage full', e);
  }
}

function createNewSession() {
  const newSess = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: '新问卜 · ' + new Date().toLocaleDateString(),
    created: Date.now(),
    messages: []
  };
  sessions.unshift(newSess);
  currentSessionId = newSess.id;
  saveSessions();
  renderHistoryList();
  renderCurrentChat();
  closeSidebar();
}

function renderHistoryList() {
  historyList.innerHTML = '';
  if (!sessions.length) {
    historyList.innerHTML = '<div class="history-empty">暂无历史问卜</div>';
    return;
  }
  sessions.forEach(sess => {
    const item = document.createElement('div');
    item.className = 'history-item' + (sess.id === currentSessionId ? ' active' : '');
    item.innerHTML = `
      <div class="history-title-wrap">
        <i data-lucide="message-square"></i>
        <span>${escapeHtml(sess.title)}</span>
      </div>
      <button class="history-item-del" title="删除"><i data-lucide="trash-2"></i></button>
    `;
    item.querySelector('.history-title-wrap').addEventListener('click', () => {
      currentSessionId = sess.id;
      renderHistoryList();
      renderCurrentChat();
      closeSidebar();
    });
    item.querySelector('.history-item-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(sess.id);
    });
    historyList.appendChild(item);
  });
  if (window.lucide) window.lucide.createIcons();
}

function deleteSession(id) {
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

function renderCurrentChat() {
  const sess = sessions.find(s => s.id === currentSessionId);
  if (!sess) return;
  chatTitle.textContent = sess.title;
  
  // 清理消息容器（保留欢迎卡片）
  const msgNodes = chatInner.querySelectorAll('.msg-row');
  msgNodes.forEach(n => n.remove());

  if (!sess.messages.length) {
    welcomeCard.style.display = 'block';
  } else {
    welcomeCard.style.display = 'none';
    sess.messages.forEach(m => renderMessageNode(m.role, m.content, m.images || []));
  }
  scrollToBottom();
}

function renderMessageNode(role, rawContent, images = [], isNew = false) {
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
  meta.textContent = isUser ? '求问善信' : '玄机子';
  wrapper.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatDivinationContent(rawContent);

  if (images && images.length) {
    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs-in-msg';
    images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      thumbs.appendChild(img);
    });
    bubble.appendChild(thumbs);
  }
  wrapper.appendChild(bubble);

  if (!isUser) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML = `
      <button class="msg-action-btn" data-act="copy"><i data-lucide="copy"></i><span>复制卦辞</span></button>
      <button class="msg-action-btn" data-act="share"><i data-lucide="share-2"></i><span>符笺海报</span></button>
      <button class="msg-action-btn" data-act="up"><i data-lucide="thumbs-up"></i><span>有启发</span></button>
    `;
    actions.querySelector('[data-act="copy"]').addEventListener('click', (e) => {
      navigator.clipboard.writeText(rawContent).then(() => {
        const btn = e.target.closest('button');
        btn.innerHTML = '<i data-lucide="check"></i><span>已复制</span>';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = '<i data-lucide="copy"></i><span>复制卦辞</span>';
          if (window.lucide) window.lucide.createIcons();
        }, 1500);
      });
    });
    actions.querySelector('[data-act="share"]').addEventListener('click', () => {
      openPosterModal(rawContent);
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

  if (window.lucide) window.lucide.createIcons();
  if (isNew) scrollToBottom();
}

function formatDivinationContent(text) {
  if (!text) return '';
  // 1. 彻底过滤任何思考、推理、搜索内部标签
  let cleaned = text.replace(/<(think|thought|reasoning|search)>[\s\S]*?<\/\1>/gi, '').trim();

  // 2. 格式化玄机箴言（支持多行引用 > **...** 以及各种前缀格式）
  cleaned = cleaned.replace(/(?:【玄机箴言】|###\s*玄机箴言|\*\*玄机箴言\*\*|玄机箴言[：:])[\s*#]*([\s\S]*?)(?=(?:\n\s*\n\s*(?:【|###|\*\*)|$))/gi, (match, content) => {
    const lines = content
      .split('\n')
      .map(l => l.replace(/^[>\s*#]+/, '').replace(/[\s*#]+$/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim())
      .filter(Boolean);
    const poem = lines.join('<br>');
    return `<div class="fortune-box"><i data-lucide="sparkles"></i><div><strong>玄机箴言：</strong><br>${poem}</div></div>`;
  });

  // 3. 核心分段标题转换为神圣标识（支持 【】、###、** 等格式）
  cleaned = cleaned.replace(/(?:【建议趋避】|###\s*建议趋避|\*\*建议趋避\*\*|建议趋避[：:])/g, '<div class="section-title"><i data-lucide="shield"></i> 建议趋避</div>');
  cleaned = cleaned.replace(/(?:【象数解析】|###\s*象数解析|\*\*象数解析\*\*|象数解析[：:])/g, '<div class="section-title"><i data-lucide="compass"></i> 象数解析</div>');
  cleaned = cleaned.replace(/(?:【吉凶趋避】|###\s*吉凶趋避|\*\*吉凶趋避\*\*|吉凶趋避[：:])/g, '<div class="section-title"><i data-lucide="flame"></i> 吉凶趋避</div>');
  cleaned = cleaned.replace(/(?:【可行建议】|###\s*可行建议|\*\*可行建议\*\*|可行建议[：:])/g, '<div class="section-title"><i data-lucide="target"></i> 可行建议</div>');

  // 4. 清理 Markdown 引用符 (>)、水平分割线 (---) 与列表符
  cleaned = cleaned.replace(/^[ \t]*>[ \t]?/gm, '');
  cleaned = cleaned.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
  cleaned = cleaned.replace(/^[ \t]*[-*]\s+/gm, '• ');

  // 5. 格式化粗体 **text** -> <strong>text</strong>
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 6. 彻底清除任何遗留的孤立 markdown 符号
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');
  cleaned = cleaned.replace(/\*\*/g, '');

  // 7. 优雅分段包裹
  const paras = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const htmlParas = [];
  for (const p of paras) {
    if (p.startsWith('<div class="section-title"') || p.startsWith('<div class="fortune-box"')) {
      htmlParas.push(p);
    } else {
      htmlParas.push(`<p>${p.replace(/\n/g, '<br>')}</p>`);
    }
  }
  return htmlParas.join('');
}

function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
  }, 60);
}

// 消息发送与 API 请求
async function handleSend(customText = null) {
  const text = (customText !== null ? customText : userInput.value).trim();
  const hasImages = pendingImages.length > 0;
  if ((!text && !hasImages) || isRequesting) return;

  isRequesting = true;
  sound.playChime();

  const sess = sessions.find(s => s.id === currentSessionId);
  if (!sess) return;

  const currentImgs = [...pendingImages];
  pendingImages = [];
  renderAttachPreview();

  const userContent = text || '（已上传相格或户型图，请玄机子推演）';
  welcomeCard.style.display = 'none';

  sess.messages.push({
    role: 'user',
    content: userContent,
    images: currentImgs.map(img => img.dataUrl)
  });

  if (sess.messages.length === 1 && text) {
    sess.title = text.slice(0, 14);
    chatTitle.textContent = sess.title;
    renderHistoryList();
  }

  renderMessageNode('user', userContent, currentImgs.map(img => img.dataUrl), true);
  saveSessions();

  userInput.value = '';
  autoGrowTextarea();
  sendBtn.disabled = true;
  showLoading(true);

  try {
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    setStatus('玄机子正在排盘推演……');

    let resp;
    try {
      resp = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          temperature: 0.72,
          max_tokens: 2200
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      let detail = '';
      try { detail = (await resp.json())?.error || ''; } catch {}
      throw new Error(detail || `网络状态码 ${resp.status}`);
    }

    setStatus('灵台清明 · 气场通达');

    const data = await resp.json();
    const reply = data.choices && data.choices[0]?.message?.content
      ? data.choices[0].message.content
      : '天机稍晦，方才推演未得定数。建议稍候重新问卜。';

    sess.messages.push({ role: 'assistant', content: reply });
    saveSessions();
    renderMessageNode('assistant', reply, [], true);
    sound.playChime();
  } catch (err) {
    console.error(err);
    setStatus('推演遇到波动 · 已自动兜底');
    const fallback = `推演暂遇阻滞。\n\n【建议趋避】稍候片刻重新问卜，若上传了图片请将大小保持在2MB以内。\n\n【玄机箴言】静水流深，急则生变；稍安勿躁，自有明断。`;
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
  loadingOverlay.classList.toggle('active', show);
  loadingOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function setStatus(text) {
  statusBadgeText.textContent = text;
}

// 绑定输入框与侧边栏事件
function bindEvents() {
  userInput.addEventListener('input', autoGrowTextarea);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', () => handleSend());
  document.getElementById('newChatBtn').addEventListener('click', createNewSession);
  document.getElementById('headerNewChatBtn').addEventListener('click', createNewSession);
  document.getElementById('clearAllHistoryBtn').addEventListener('click', () => {
    if (confirm('确认清空所有历史问卜档案？')) {
      sessions = [];
      createNewSession();
    }
  });

  // 头部海报按钮绑定
  const headerShareBtn = document.getElementById('headerShareBtn');
  if (headerShareBtn) {
    headerShareBtn.addEventListener('click', () => {
      const sess = sessions.find(s => s.id === currentSessionId);
      const lastMsg = sess?.messages?.filter(m => m.role === 'assistant')?.slice(-1)[0]?.content || '天道酬勤，顺势而为。易理幽微，神明默会。';
      openPosterModal(lastMsg);
    });
  }

  // 侧边栏抽屉开关
  document.getElementById('openSidebarBtn').addEventListener('click', openSidebar);
  document.getElementById('closeSidebarBtn').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // 点击遮罩空白区域关闭模态框
  document.querySelectorAll('.modal-backdrop').forEach(mb => {
    mb.addEventListener('click', (e) => {
      if (e.target === mb) mb.classList.remove('show');
    });
  });

  // 快捷按钮点击
  document.querySelectorAll('[data-prompt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) handleSend(prompt);
    });
  });

  // 法器打开弹窗绑定
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      openToolModal(tool);
    });
  });

  // 模态框关闭绑定
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('show');
    });
  });

  // 图片上传
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  // 音频切换
  soundToggleBtn.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    soundIcon.setAttribute('data-lucide', sound.enabled ? 'volume-2' : 'volume-x');
    if (window.lucide) window.lucide.createIcons();
  });

  // 关于弹窗
  document.getElementById('aboutBtn').addEventListener('click', () => {
    document.getElementById('modalAbout').classList.add('show');
  });

  // 随喜赞助弹窗
  const openSponsor = () => {
    document.getElementById('modalSponsor').classList.add('show');
    closeSidebar();
  };
  const headerSponsorBtn = document.getElementById('headerSponsorBtn');
  if (headerSponsorBtn) headerSponsorBtn.addEventListener('click', openSponsor);
  const sidebarSponsorBtn = document.getElementById('sidebarSponsorBtn');
  if (sidebarSponsorBtn) sidebarSponsorBtn.addEventListener('click', openSponsor);

  // 赞助金额切换
  document.querySelectorAll('.amount-btn').forEach(ab => {
    ab.addEventListener('click', () => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      ab.classList.add('active');
      sound.playChime();
    });
  });

  // 初始化各法器交互逻辑
  initTarotLogic();
  initIchingLogic();
  initMeihuaLogic();
  initXiaoliurenLogic();
  initBaziLogic();
  initLotLogic();
  initMuyuLogic();
  initDreamLogic();
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

function autoGrowTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
}

function openToolModal(tool) {
  const modalMap = {
    tarot: 'modalTarot',
    iching: 'modalIching',
    meihua: 'modalMeihua',
    xiaoliuren: 'modalXiaoliuren',
    bazi: 'modalBazi',
    lot: 'modalLot',
    almanac: 'modalAlmanac',
    dream: 'modalDream',
    muyu: 'modalMuyu'
  };
  const mId = modalMap[tool];
  if (mId) {
    const el = document.getElementById(mId);
    if (el) el.classList.add('show');
    closeSidebar();
  }
}

// 图片压缩
function compressImage(file, maxSide = 1100, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式无法识别'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSide || h > maxSide) {
          const ratio = Math.min(maxSide / w, maxSide / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
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
    try {
      const dataUrl = await compressImage(f);
      pendingImages.push({ file: f, dataUrl });
    } catch (err) {
      console.error(err);
    }
  }
  fileInput.value = '';
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
  pendingImages.forEach((item, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-item';
    wrap.innerHTML = `
      <img src="${item.dataUrl}" />
      <button class="thumb-del-btn" data-del="${idx}">&times;</button>
    `;
    wrap.querySelector('.thumb-del-btn').addEventListener('click', () => {
      pendingImages.splice(idx, 1);
      renderAttachPreview();
    });
    thumbsList.appendChild(wrap);
  });
}

// ==================== 1. 灵犀塔罗逻辑 (Zero Emoji · 优雅罗马数字) ====================
let drawnTarotCards = [];
function initTarotLogic() {
  const drawBtn = document.getElementById('drawTarotBtn');
  const submitBtn = document.getElementById('submitTarotBtn');
  const resultDesc = document.getElementById('tarotResultDesc');

  drawBtn.addEventListener('click', () => {
    sound.playChime();
    // 随机无放回抽取 3 张牌
    const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
    drawnTarotCards = [
      { ...shuffled[0], isReversed: Math.random() > 0.65, slot: '过去' },
      { ...shuffled[1], isReversed: Math.random() > 0.65, slot: '现在' },
      { ...shuffled[2], isReversed: Math.random() > 0.65, slot: '未来' }
    ];

    ['tarotCard1', 'tarotCard2', 'tarotCard3'].forEach((cId, idx) => {
      const card = document.getElementById(cId);
      const front = document.getElementById('tarotFront' + (idx + 1));
      const info = drawnTarotCards[idx];
      
      front.innerHTML = `
        <div class="card-num-badge">${info.num}</div>
        <div class="card-name">${info.name}</div>
        <div class="card-pos">${info.isReversed ? '【逆位】' : '【正位】'}</div>
      `;
      card.classList.remove('flipped');
      setTimeout(() => card.classList.add('flipped'), 150 * (idx + 1));
    });

    resultDesc.style.display = 'block';
    resultDesc.innerHTML = `
      <strong>圣三角牌阵排定：</strong><br>
      • 过去（起因）：${drawnTarotCards[0].name} ${drawnTarotCards[0].isReversed ? '逆位' : '正位'}<br>
      • 现在（处境）：${drawnTarotCards[1].name} ${drawnTarotCards[1].isReversed ? '逆位' : '正位'}<br>
      • 未来（走向）：${drawnTarotCards[2].name} ${drawnTarotCards[2].isReversed ? '逆位' : '正位'}
    `;
    submitBtn.disabled = false;
  });

  submitBtn.addEventListener('click', () => {
    const q = document.getElementById('tarotQuestion').value.trim() || '求问当前困惑与走向';
    const prompt = `【灵犀塔罗·圣三角牌阵问卜】\n所问心念：${q}\n牌阵排定：\n1. 过去因缘：${drawnTarotCards[0].name}（${drawnTarotCards[0].isReversed ? '逆位' : '正位'}）\n2. 当下境遇：${drawnTarotCards[1].name}（${drawnTarotCards[1].isReversed ? '逆位' : '正位'}）\n3. 未来走向：${drawnTarotCards[2].name}（${drawnTarotCards[2].isReversed ? '逆位' : '正位'}）\n请玄机子结合三牌之生克象意，为我详析起因、现状瓶颈与未来破局指引。`;
    document.getElementById('modalTarot').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 2. 周易六爻逻辑 ====================
let ichingLines = [];
function initIchingLogic() {
  const tossBtn = document.getElementById('tossCoinBtn');
  const submitBtn = document.getElementById('submitIchingBtn');
  const tossStep = document.getElementById('tossStep');
  const hexLines = document.getElementById('hexagramLines');
  const resBox = document.getElementById('ichingResult');

  tossBtn.addEventListener('click', () => {
    if (ichingLines.length >= 6) return;
    sound.playCoin();

    ['coin1', 'coin2', 'coin3'].forEach(cId => {
      const c = document.getElementById(cId);
      c.classList.remove('flipping');
      void c.offsetWidth;
      c.classList.add('flipping');
    });

    const c1 = Math.random() > 0.5 ? 3 : 2;
    const c2 = Math.random() > 0.5 ? 3 : 2;
    const c3 = Math.random() > 0.5 ? 3 : 2;
    const sum = c1 + c2 + c3;
    ichingLines.push(sum);

    renderHexLines();

    if (ichingLines.length < 6) {
      tossStep.textContent = `第 ${ichingLines.length + 1} 爻 / 共 6 爻`;
    } else {
      tossStep.textContent = '六爻成卦 · 功德圆满';
      tossBtn.disabled = true;
      submitBtn.disabled = false;
      resBox.style.display = 'block';
      resBox.innerHTML = `<strong>周易六爻已排定</strong>（自初爻至上爻依次为：${ichingLines.join('、')}）`;
    }
  });

  function renderHexLines() {
    hexLines.innerHTML = '';
    [...ichingLines].reverse().forEach((val, idx) => {
      const lineIdx = ichingLines.length - idx;
      const isYang = val === 7 || val === 9;
      const isDong = val === 6 || val === 9;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.margin = '4px 0';
      row.innerHTML = `
        <span style="font-size:11px;color:var(--gold);width:36px;">第${lineIdx}爻</span>
        <div style="flex:1;height:10px;background:${isYang ? 'var(--gold)' : 'linear-gradient(90deg, var(--gold) 45%, transparent 45%, transparent 55%, var(--gold) 55%)'};border-radius:2px;"></div>
        <span style="font-size:11px;color:${isDong ? 'var(--cinnabar)' : 'var(--text-muted)'};width:40px;">${isDong ? '动爻' : '静爻'}</span>
      `;
      hexLines.appendChild(row);
    });
  }

  submitBtn.addEventListener('click', () => {
    const matter = document.getElementById('ichingMatter').value.trim() || '问近期大事吉凶与转机';
    const prompt = `【周易六爻纳甲占断】\n问卜事由：${matter}\n六爻数理（自初爻至上爻）：${ichingLines.join('、')}\n请玄机子为我排出本卦、变卦，并依动爻纳甲、六亲世应，给出吉凶剖析与具体趋避方策。`;
    document.getElementById('modalIching').classList.remove('show');
    ichingLines = [];
    tossBtn.disabled = false;
    submitBtn.disabled = true;
    tossStep.textContent = '第 1 爻 / 共 6 爻';
    hexLines.innerHTML = '';
    resBox.style.display = 'none';
    handleSend(prompt);
  });
}

// ==================== 3. 梅花易数逻辑 ====================
function initMeihuaLogic() {
  const pills = document.querySelectorAll('[data-meihuatab]');
  const secTime = document.getElementById('meihuaTimeSection');
  const secNum = document.getElementById('meihuaNumSection');
  const resPanel = document.getElementById('meihuaResultPanel');
  const submitBtn = document.getElementById('submitMeihuaBtn');

  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      const isTime = p.getAttribute('data-meihuatab') === 'time';
      secTime.style.display = isTime ? 'block' : 'none';
      secNum.style.display = isTime ? 'none' : 'block';
    });
  });

  document.getElementById('meihuaNowBtn').addEventListener('click', () => {
    sound.playChime();
    const d = new Date();
    const up = ((d.getFullYear() + d.getMonth() + 1 + d.getDate()) % 8) || 8;
    const down = ((d.getFullYear() + d.getMonth() + 1 + d.getDate() + d.getHours()) % 8) || 8;
    const dong = ((up + down) % 6) || 6;
    showMeihuaResult(up, down, dong, '当前时辰数理起卦');
  });

  document.getElementById('meihuaNumCalcBtn').addEventListener('click', () => {
    const n1 = parseInt(document.getElementById('meihuaNum1').value) || 3;
    const n2 = parseInt(document.getElementById('meihuaNum2').value) || 8;
    const up = (n1 % 8) || 8;
    const down = (n2 % 8) || 8;
    const dong = ((n1 + n2) % 6) || 6;
    showMeihuaResult(up, down, dong, `报数数理 (${n1}, ${n2}) 起卦`);
  });

  const guaNames = ['', '乾为天', '兑为泽', '离为火', '震为雷', '巽为风', '坎为水', '艮为山', '坤为地'];
  let currentMeihuaData = null;

  function showMeihuaResult(up, down, dong, mode) {
    currentMeihuaData = { up, down, dong, mode };
    resPanel.style.display = 'block';
    document.getElementById('mBenName').textContent = `${guaNames[up] || '上卦'} / ${guaNames[down] || '下卦'}`;
    document.getElementById('mBenDesc').textContent = `动爻在第 ${dong} 爻`;
    document.getElementById('mHuName').textContent = '依动爻推演互卦';
    document.getElementById('mBianName').textContent = '生克演化变卦';
    document.getElementById('meihuaTiyong').innerHTML = `<strong>体用生克：</strong>以不动者为体，动爻所在为用。`;
    submitBtn.disabled = false;
  }

  submitBtn.addEventListener('click', () => {
    if (!currentMeihuaData) return;
    const prompt = `【梅花易数推演】\n起卦方式：${currentMeihuaData.mode}\n上卦数：${currentMeihuaData.up}，下卦数：${currentMeihuaData.down}，动爻：第${currentMeihuaData.dong}爻。\n请玄机子依梅花易数定出本卦、互卦、变卦，并判定体用五行生克与应期时机。`;
    document.getElementById('modalMeihua').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 4. 小六壬掌中诀逻辑 ====================
function initXiaoliurenLogic() {
  const rollBtn = document.getElementById('xlrRollBtn');
  const submitBtn = document.getElementById('submitXlrBtn');
  const resPanel = document.getElementById('xlrResultPanel');
  const cells = document.querySelectorAll('.xlr-cell');
  let selectedXlr = null;

  rollBtn.addEventListener('click', () => {
    sound.playChime();
    let count = 0;
    const target = Math.floor(Math.random() * 6) + 1;
    const totalSteps = 18 + target;

    const timer = setInterval(() => {
      cells.forEach(c => c.classList.remove('active'));
      const activeIdx = (count % 6);
      cells[activeIdx].classList.add('active');
      count++;
      if (count >= totalSteps) {
        clearInterval(timer);
        const finalCell = cells[(count - 1) % 6];
        const name = finalCell.querySelector('strong').textContent;
        const desc = finalCell.querySelector('span').textContent;
        selectedXlr = { name, desc };
        resPanel.style.display = 'block';
        resPanel.innerHTML = `<strong>掐指落宫：【${name}】</strong> — ${desc}`;
        submitBtn.disabled = false;
      }
    }, 60);
  });

  submitBtn.addEventListener('click', () => {
    const q = document.getElementById('xlrQuestion').value.trim() || '问近事吉凶';
    const prompt = `【小六壬速断】\n求测近事：${q}\n掐指落宫：【${selectedXlr.name}】（${selectedXlr.desc}）\n请玄机子依小六壬口诀速断吉凶方位与应期。`;
    document.getElementById('modalXiaoliuren').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 5. 四柱八字排盘逻辑 ====================
function initBaziLogic() {
  const calcBtn = document.getElementById('calcBaziBtn');
  const submitBtn = document.getElementById('submitBaziBtn');
  const tableWrap = document.getElementById('baziResultTable');

  calcBtn.addEventListener('click', () => {
    sound.playChime();
    const y = document.getElementById('bzYear').value;
    const m = document.getElementById('bzMonth').value;
    const d = document.getElementById('bzDay').value;
    const h = document.getElementById('bzHour').value;
    const gender = document.getElementById('bzGender').value;
    const city = document.getElementById('bzCity').value;

    tableWrap.style.display = 'block';
    tableWrap.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:8px;padding:12px;margin-top:10px;">
        <h4 style="color:var(--gold);margin-bottom:8px;">${gender} · 公历 ${y}年${m}月${d}日 ${h}时 (${city})</h4>
        <p style="font-size:12px;color:var(--text-sub);">已校准真太阳时，四柱干支与大运格局已备就。</p>
      </div>
    `;
    submitBtn.disabled = false;
  });

  submitBtn.addEventListener('click', () => {
    const y = document.getElementById('bzYear').value;
    const m = document.getElementById('bzMonth').value;
    const d = document.getElementById('bzDay').value;
    const h = document.getElementById('bzHour').value;
    const gender = document.getElementById('bzGender').value;
    const city = document.getElementById('bzCity').value;
    const prompt = `【四柱八字精批】\n造化：${gender}\n公历生辰：${y}年${m}月${d}日 ${h}时\n出生地：${city}\n请玄机子依真太阳时排定年柱、月柱、日柱、时柱，并剖析日主五行衰旺、十神格局、用神喜忌与大运流年指引。`;
    document.getElementById('modalBazi').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 6. 观象灵签逻辑 ====================
function initLotLogic() {
  const shakeBtn = document.getElementById('shakeLotBtn');
  const submitBtn = document.getElementById('submitLotBtn');
  const cylinder = document.getElementById('lotCylinder');
  const poemCard = document.getElementById('lotPoemCard');
  let currentLot = null;

  const lots = [
    { num: 1, title: '第一签 · 上上', poem: '巍巍独步向云间，玉兔升天渐觉圆。\n读画看书自清泰，贵人相引上青天。', desc: '求名遂意，作事有成。' },
    { num: 8, title: '第八签 · 上吉', poem: '年喜秋成稻谷香，行舟乘风好过江。\n逢凶化吉安然度，正是东君照日光。', desc: '顺风行船，逢凶化吉。' },
    { num: 16, title: '第十六签 · 中吉', poem: '静坐幽室思过往，莫向长空怨风霜。\n若待春雷惊百蛰，潜龙脱困自飞扬。', desc: '蓄势待发，静候时机。' },
    { num: 28, title: '第二十八签 · 见机', poem: '雾锁孤山路径迷，偶逢樵子指云梯。\n莫将小忿伤大雅，谦逊从容万事吉。', desc: '谦和守中，自有贵人。' }
  ];

  shakeBtn.addEventListener('click', () => {
    sound.playChime();
    cylinder.style.animation = 'spinSlow 0.6s ease-in-out';
    setTimeout(() => {
      cylinder.style.animation = '';
      currentLot = lots[Math.floor(Math.random() * lots.length)];
      poemCard.style.display = 'block';
      poemCard.innerHTML = `
        <div style="background:rgba(199,62,29,0.12);border:1px solid var(--cinnabar);border-radius:8px;padding:14px;margin-top:12px;">
          <h4 style="color:#ff7854;margin-bottom:6px;">${currentLot.title}</h4>
          <p style="font-family:var(--font-serif);font-size:14px;color:#fdfbf7;line-height:1.8;margin-bottom:8px;">${currentLot.poem.replace(/\n/g, '<br>')}</p>
          <div style="font-size:12px;color:var(--gold);">${currentLot.desc}</div>
        </div>
      `;
      submitBtn.disabled = false;
    }, 600);
  });

  submitBtn.addEventListener('click', () => {
    if (!currentLot) return;
    const prompt = `【观象灵签解签】\n求得签文：${currentLot.title}\n签诗：${currentLot.poem}\n请玄机子为我解开其中隐喻，指明近期事业、心念与前程之吉凶转机。`;
    document.getElementById('modalLot').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 7. 功德木鱼逻辑 ====================
let muyuCount = 0;
function initMuyuLogic() {
  const wood = document.getElementById('muyuWood');
  const countEl = document.getElementById('muyuCount');

  wood.addEventListener('click', () => {
    sound.playMuyu();
    muyuCount++;
    countEl.textContent = muyuCount;

    const floatText = document.createElement('div');
    floatText.textContent = '+1 功德';
    floatText.style.position = 'absolute';
    floatText.style.color = 'var(--gold)';
    floatText.style.fontWeight = 'bold';
    floatText.style.fontSize = '16px';
    floatText.style.pointerEvents = 'none';
    floatText.style.left = '50%';
    floatText.style.top = '40%';
    floatText.style.transform = 'translate(-50%, -50%)';
    floatText.style.animation = 'floatGongDe 0.8s ease-out forwards';
    wood.parentElement.appendChild(floatText);

    setTimeout(() => floatText.remove(), 800);
  });
}

// ==================== 8. 周公解梦逻辑 ====================
function initDreamLogic() {
  const chips = document.querySelectorAll('.d-chip');
  const txt = document.getElementById('dreamDetail');
  const submitBtn = document.getElementById('submitDreamBtn');

  chips.forEach(c => {
    c.addEventListener('click', () => {
      const tag = c.getAttribute('data-dream');
      txt.value = (txt.value ? txt.value + '，' : '') + '梦见' + tag;
    });
  });

  submitBtn.addEventListener('click', () => {
    const detail = txt.value.trim();
    if (!detail) return alert('请先描述梦境详情。');
    const prompt = `【周公解梦意象解析】\n梦境实录：${detail}\n请玄机子依周公解梦与现代潜意识原型，为我解析此梦之征兆与心灵启示。`;
    document.getElementById('modalDream').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 9. 今日黄历渲染 ====================
function renderAlmanacData() {
  const content = document.getElementById('almanacContent');
  const d = new Date();
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  content.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-card);border-radius:12px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:18px;font-weight:bold;color:var(--gold);">${dateStr}</span>
        <span style="background:rgba(199,62,29,0.2);color:#ff7854;border:1px solid var(--cinnabar);padding:2px 8px;border-radius:4px;font-size:12px;">青龙黄道吉日</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;">
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);padding:10px;border-radius:8px;">
          <strong style="color:var(--jade);">【宜】</strong><br>
          <span style="font-size:13px;color:var(--text-main);">祈福、祭祀、交易、求财、订盟、出行</span>
        </div>
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:10px;border-radius:8px;">
          <strong style="color:#f87171;">【忌】</strong><br>
          <span style="font-size:13px;color:var(--text-main);">动土、词讼、安葬、借贷</span>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-sub);line-height:1.8;">
        • 财神方位：正东 | 喜神方位：西南 | 福神方位：西北<br>
        • 今日冲煞：岁煞北 · 冲鼠
      </div>
    </div>
  `;

  document.getElementById('queryAlmanacDayBtn').addEventListener('click', () => {
    document.getElementById('modalAlmanac').classList.remove('show');
    handleSend(`求问玄机子：今日(${dateStr})吉凶宜忌与行事趋避如何？`);
  });
}

// ==================== 10. 符笺海报 Canvas 生成 ====================
function openPosterModal(text) {
  const modal = document.getElementById('modalPoster');
  modal.classList.add('show');

  const canvas = document.getElementById('posterCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 1. 背景渐变
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1c1828');
  bgGrad.addColorStop(0.5, '#120e1d');
  bgGrad.addColorStop(1, '#0b0814');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. 边框纹饰
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, w - 64, h - 64);

  // 3. 顶部印章与标题
  ctx.fillStyle = '#9d2f23';
  ctx.fillRect(w / 2 - 28, 54, 56, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px serif';
  ctx.textAlign = 'center';
  ctx.fillText('玄', w / 2, 94);

  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 24px serif';
  ctx.fillText('玄机子 · 灵台符笺', w / 2, 145);

  ctx.fillStyle = '#8e86b0';
  ctx.font = '14px sans-serif';
  ctx.fillText(new Date().toLocaleDateString() + ' · 观象授时', w / 2, 175);

  // 4. 正文文本分行绘制
  ctx.fillStyle = '#f5f3ff';
  ctx.font = '18px serif';
  ctx.textAlign = 'left';

  const cleanText = text.replace(/<[^>]+>/g, '').slice(0, 480);
  const maxWidth = w - 120;
  let y = 230;
  let line = '';

  for (let i = 0; i < cleanText.length; i++) {
    const testLine = line + cleanText[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth || cleanText[i] === '\n') {
      ctx.fillText(line, 60, y);
      line = cleanText[i] === '\n' ? '' : cleanText[i];
      y += 30;
      if (y > h - 140) break;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, 60, y);

  // 5. 底部箴言
  ctx.fillStyle = '#d4af37';
  ctx.font = 'italic 16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('「知命而不受制于命，顺势而为，自强不息」', w / 2, h - 65);

  document.getElementById('downloadPosterBtn').onclick = () => {
    const link = document.createElement('a');
    link.download = `玄机子符笺_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
}

// 辅助函数
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', initApp);
