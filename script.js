// 玄机子 · 东方数理与灵犀占断 (XuanJiZi v8.3)
// 纯净典雅设计，无任何低质表情符号，支持多线路无缝容灾、3D 塔罗、六爻、梅花、八字、小六壬、摇签、黄历、木鱼与海报生成

const API_ENDPOINT = '/api/chat';
const STORAGE_KEY = 'xuanjizi_sessions_v7';
const SIDEBAR_KEY = 'xuanjizi_sidebar';
const SYSTEM_PROMPT = `你是【玄机子】。以东方术数（周易六爻、梅花易数、四柱八字、小六壬、黄历、灵签）与塔罗圣三角为镜，帮问卜者把一件心事看清楚，再把选择还给他自己。

口吻：沉静、具体、克制，像懂易理的先生，不是神棍，也不是客服。

每次回答只使用下面四个小标题，顺序固定，不要改名，不要加其他大标题：
【象数解析】
【吉凶趋避】
【可行建议】
【玄机箴言】

写法：
- 【象数解析】只解读用户已经给出的牌、爻、卦名、宫位或生辰资料；没有给出的象数不要补造一套。
- 【吉凶趋避】用倾向语气（较顺、有滞、宜缓、可试），指出机遇与隐患。
- 【可行建议】必须 3 条，且是今天就能做的具体事，不要空话。
- 【玄机箴言】一句，不超过 28 字。

严禁：
- 输出 <think>、<reasoning> 或任何思考标签；
- 使用 Emoji；
- 使用 Markdown 的 # 标题或 --- 分割线；
- 自称人工智能，或说“仅为娱乐”“无法算命”；收尾用“供你参详，抉择仍在自身”；
- 断言死亡、重病、破产、必成、必赚、必散；
- 在没有可靠历法计算时编造精确四柱、真太阳时、值神或宜忌清单。若依据不足，直接写明不确定处。
- 医疗、法律、投资只谈心态与步骤，并点明需问专业人士。`;

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
    this.enabled = localStorage.getItem('xuanjizi_sound') !== 'off';
    this.master = 0.55;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  setEnabled(v) {
    this.enabled = !!v;
    localStorage.setItem('xuanjizi_sound', this.enabled ? 'on' : 'off');
    if (this.enabled) this.play('open');
  }
  tone(freq, duration=.35, type='sine', gain=.045, delay=0, endFreq=null) {
    const ctx=this.init(); if(!ctx || !this.enabled) return;
    const t=ctx.currentTime+delay;
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type=type; osc.frequency.setValueAtTime(freq,t);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*this.master),t+.018);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+duration+.03);
  }
  noise(duration=.16, gain=.025, delay=0, highpass=1000) {
    const ctx=this.init(); if(!ctx || !this.enabled) return;
    const len=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buf=ctx.createBuffer(1,len,ctx.sampleRate), data=buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.8);
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), g=ctx.createGain();
    filter.type='highpass';filter.frequency.value=highpass;g.gain.value=gain*this.master;
    src.buffer=buf;src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start(ctx.currentTime+delay);
  }
  play(kind='open') {
    if(!this.enabled) return;
    switch(kind){
      case 'tarot':
        this.tone(392,.75,'sine',.045,0,523); this.tone(659,.85,'sine',.028,.08,784); this.noise(.28,.012,.04,2400); break;
      case 'shuffle':
        this.noise(.34,.045,0,1500); this.noise(.32,.035,.22,1700); this.tone(440,.28,'triangle',.018,.08,523); break;
      case 'flip':
        this.noise(.12,.025,0,2800); this.tone(740,.48,'sine',.045,.02,988); this.tone(1110,.38,'sine',.02,.07); break;
      case 'iching':
      case 'coin':
        [1180,1420,980].forEach((f,i)=>{this.tone(f,.34,'triangle',.052,i*.055,f*.82);this.noise(.06,.018,i*.055,2600)}); break;
      case 'meihua':
        this.tone(256,1.05,'sine',.04,0,196);this.tone(512,.8,'sine',.025,.13,640);this.tone(768,.65,'sine',.016,.22);break;
      case 'xiaoliuren': this.tone(680,.09,'triangle',.025,0,520); break;
      case 'tick': this.tone(880,.055,'square',.009,0,760); break;
      case 'bazi':
        this.tone(128,1.35,'sine',.055,0,86);this.tone(256,1.1,'sine',.018,.06,170);this.tone(384,.8,'sine',.012,.15);break;
      case 'lot':
        for(let i=0;i<6;i++){this.noise(.08,.027,i*.055,1800);this.tone(520+i*24,.12,'triangle',.015,i*.055)} break;
      case 'dream':
        this.tone(440,1.2,'sine',.022,0,660);this.tone(880,1.0,'sine',.014,.15,1040);this.tone(1320,.7,'sine',.008,.28);break;
      case 'muyu':
        this.tone(245,.22,'sine',.12,0,118);this.tone(490,.11,'triangle',.026,0,260);this.noise(.08,.014,0,800);break;
      case 'almanac': this.tone(330,.6,'triangle',.025,0,392);this.tone(495,.55,'sine',.018,.1,660);break;
      case 'send': this.tone(410,.34,'sine',.026,0,620);this.tone(820,.32,'sine',.018,.08);break;
      case 'oracle': this.tone(523,.7,'sine',.036,0,659);this.tone(784,.72,'sine',.023,.12,988);break;
      case 'close': this.tone(440,.22,'sine',.018,0,330);break;
      case 'sponsor': this.tone(523,.55,'sine',.028);this.tone(659,.5,'sine',.02,.09);break;
      case 'poster': this.tone(587,.44,'sine',.02);this.tone(880,.42,'sine',.016,.07);break;
      default: this.tone(528,.55,'sine',.032,0,720);
    }
  }
  playChime(){ this.play('open'); }
  playCoin(){ this.play('coin'); }
  playMuyu(){ this.play('muyu'); }
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
  restoreSidebar();
  loadSessions();
  bindEvents();
  renderHistoryList();
  renderAlmanacData();
  initAtmosphere();
  const mq = window.matchMedia('(max-width: 768px)');
  mq.addEventListener('change', (e) => {
    if (e.matches) {
      document.body.classList.remove('sidebar-collapsed');
      closeMobileNav();
    } else if (localStorage.getItem(SIDEBAR_KEY) === 'collapsed') {
      document.body.classList.add('sidebar-collapsed');
      closeMobileNav();
    }
    syncSidebarTrigger();
  });
  if (window.lucide) window.lucide.createIcons();
}

function restoreSidebar() {
  if (!isMobileNav() && localStorage.getItem(SIDEBAR_KEY) === 'collapsed') {
    document.body.classList.add('sidebar-collapsed');
  }
  syncSidebarTrigger();
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
  const serialize = () => JSON.stringify(sessions);
  try {
    localStorage.setItem(STORAGE_KEY, serialize());
  } catch (e) {
    // 图片会迅速占满 localStorage。先剥离较旧会话中的图片，再逐步裁剪历史。
    for (const sess of sessions.slice(3)) {
      for (const msg of sess.messages || []) if (msg.images) msg.images = [];
    }
    while (sessions.length > 16) sessions.pop();
    try { localStorage.setItem(STORAGE_KEY, serialize()); }
    catch { console.warn('本地问卜档案空间已满，当前对话仍可继续。'); }
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
  pendingImages = [];
  renderAttachPreview();
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

  if (!isUser) attachMessageActions(wrapper, rawContent);

  row.appendChild(avatar);
  row.appendChild(wrapper);
  chatInner.appendChild(row);

  if (window.lucide) window.lucide.createIcons();
  if (isNew) scrollToBottom();
}

function repairGarbledText(text) {
  let s = String(text || '');
  if (!s) return '';
  s = s.replace(/\uFEFF/g, '');
  s = s.replace(/<(think|thought|reasoning|search)>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(think|thought|reasoning)[\s\S]*$/i, '');
  const mojibakeHits = (s.match(/[ÃÂâåæ]/g) || []).length;
  const cjkHits = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  if (mojibakeHits >= 2 && cjkHits < 8) {
    try {
      const bytes = Uint8Array.from(Array.from(s, (ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if ((decoded.match(/[\u4e00-\u9fff]/g) || []).length > cjkHits) s = decoded;
    } catch { /* 保持原文 */ }
  }
  s = s.replace(/\uFFFD+/g, '');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

function formatDivinationContent(text) {
  if (!text) return '';
  // 1. 清洗乱码、思考标签后再转义，阻断脚本注入。
  let cleaned = repairGarbledText(text).trim();
  cleaned = escapeHtml(cleaned);

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

function attachMessageActions(wrapper, rawContent) {
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = `
      <button class="msg-action-btn" data-act="copy"><i data-lucide="copy"></i><span>复制卦辞</span></button>
      <button class="msg-action-btn" data-act="share"><i data-lucide="share-2"></i><span>符笺海报</span></button>
      <button class="msg-action-btn" data-act="up"><i data-lucide="thumbs-up"></i><span>有启发</span></button>
    `;
  actions.querySelector('[data-act="copy"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(rawContent);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = rawContent;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    btn.innerHTML = '<i data-lucide="check"></i><span>已复制</span>';
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = '<i data-lucide="copy"></i><span>复制卦辞</span>';
      if (window.lucide) window.lucide.createIcons();
    }, 1500);
  });
  actions.querySelector('[data-act="share"]').addEventListener('click', () => {
    openPosterModal(rawContent);
  });
  actions.querySelector('[data-act="up"]').addEventListener('click', (e) => {
    e.currentTarget.classList.add('active');
    sound.playChime();
  });
  wrapper.appendChild(actions);
  if (window.lucide) window.lucide.createIcons();
}

function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
  }, 60);
}

// 消息发送与 API 实时流式请求 (SSE Streaming)
async function handleSend(customText = null) {
  const text = (customText !== null ? customText : userInput.value).trim();
  const hasImages = pendingImages.length > 0;
  if ((!text && !hasImages) || isRequesting) return;

  isRequesting = true;
  sound.play('send');

  const sess = sessions.find(s => s.id === currentSessionId);
  if (!sess) { isRequesting = false; return; }

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

  // 创建即时占位的 AI 消息节点（带流式闪烁光标）
  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">玄</div>
    <div class="msg-content-wrapper">
      <div class="msg-meta">玄机子</div>
      <div class="msg-bubble"><span class="typing-cursor"></span></div>
    </div>
  `;
  chatInner.appendChild(row);
  scrollToBottom();
  const bubble = row.querySelector('.msg-bubble');
  const wrapper = row.querySelector('.msg-content-wrapper');

  setStatus('玄机子正在排盘推演……');

  let accumulatedText = '';
  let requestTimer = null;

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
    requestTimer = setTimeout(() => controller.abort(), 120000);

    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages,
        temperature: 0.72,
        max_tokens: 2200,
        stream: true
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      clearTimeout(requestTimer);
      requestTimer = null;
      throw new Error(`网络状态码 ${resp.status}`);
    }

    setStatus('灵台清明 · 气场通达');

    // 处理 SSE 流式返回
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isDone = false;

    while (!isDone) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        if (trimmed === 'data: [DONE]') {
          isDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            accumulatedText += delta;
            bubble.innerHTML = formatDivinationContent(accumulatedText) + '<span class="typing-cursor"></span>';
            scrollToBottom();
          }
        } catch (e) {
          // 容错单行解析
        }
      }
    }

    clearTimeout(requestTimer);
    requestTimer = null;
    if (!accumulatedText.trim()) {
      accumulatedText = '天机稍晦，方才推演未得定数。建议稍候重新问卜。';
    }

    // 渲染最终结果并移除光标
    bubble.innerHTML = formatDivinationContent(accumulatedText);
    attachMessageActions(wrapper, accumulatedText);

    sess.messages.push({ role: 'assistant', content: accumulatedText });
    saveSessions();
    sound.play('oracle');
  } catch (err) {
    console.error('Stream error', err);
    setStatus('推演遇到波动 · 已自动兜底');
    const fallback = `推演暂遇阻滞。\n\n【建议趋避】稍候片刻重新问卜，若上传了图片请稍作压缩后重试。\n\n【玄机箴言】静水流深，急则生变；稍安勿躁，自有明断。`;
    bubble.innerHTML = formatDivinationContent(fallback);
    attachMessageActions(wrapper, fallback);
    sess.messages.push({ role: 'assistant', content: fallback });
    saveSessions();
  } finally {
    if (requestTimer) clearTimeout(requestTimer);
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
  document.getElementById('openSidebarBtn').addEventListener('click', toggleSidebar);
  document.getElementById('closeSidebarBtn').addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeMobileNav);

  // 点击遮罩空白区域关闭模态框
  document.querySelectorAll('.modal-backdrop').forEach(mb => {
    mb.addEventListener('click', (e) => {
      if (e.target === mb) { mb.classList.remove('show'); sound.play('close'); }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModals = [...document.querySelectorAll('.modal-backdrop.show')];
    if (openModals.length) {
      openModals[openModals.length - 1].classList.remove('show');
      sound.play('close');
      return;
    }
    if (sidebar.classList.contains('open')) closeSidebar();
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
      if (target) { target.classList.remove('show'); sound.play('close'); }
    });
  });

  // 图片上传
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  // 音频切换
  soundToggleBtn.addEventListener('click', () => {
    sound.setEnabled(!sound.enabled);
    soundIcon.setAttribute('data-lucide', sound.enabled ? 'volume-2' : 'volume-x');
    if (window.lucide) window.lucide.createIcons();
  });

  // 关于弹窗
  document.getElementById('aboutBtn').addEventListener('click', () => {
    document.getElementById('modalAbout').classList.add('show'); sound.play('open');
  });

  // 随喜赞助弹窗
  const openSponsor = () => {
    document.getElementById('modalSponsor').classList.add('show');
    sound.play('sponsor');
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

function isMobileNav() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function syncSidebarTrigger() {
  const btn = document.getElementById('openSidebarBtn');
  if (!btn) return;
  const expanded = isMobileNav() ? sidebar.classList.contains('open') : !document.body.classList.contains('sidebar-collapsed');
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  btn.innerHTML = `<i data-lucide="${expanded ? 'panel-left-close' : 'panel-left'}"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

function openSidebar() {
  if (isMobileNav()) {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  } else {
    document.body.classList.remove('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_KEY, 'open');
  }
  syncSidebarTrigger();
}

function closeMobileNav() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  syncSidebarTrigger();
}

function closeSidebar() {
  if (isMobileNav()) closeMobileNav();
}

function collapseDesktopSidebar() {
  document.body.classList.add('sidebar-collapsed');
  localStorage.setItem(SIDEBAR_KEY, 'collapsed');
  syncSidebarTrigger();
}

function toggleSidebar() {
  if (isMobileNav()) {
    if (sidebar.classList.contains('open')) closeMobileNav();
    else openSidebar();
    return;
  }
  if (document.body.classList.contains('sidebar-collapsed')) openSidebar();
  else collapseDesktopSidebar();
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
    if (el) { el.classList.add('show'); sound.play(tool); }
    if (tool === 'iching') resetIchingBoard();
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
    if (f.size > 15 * 1024 * 1024) { alert('单张图片请控制在 15MB 以内。'); continue; }
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
  const deckStage = document.getElementById('tarotDeckStage');
  const deckStack = document.getElementById('tarotDeckStack');
  const deckHint = document.getElementById('tarotDeckHint');
  let revealed = new Set();
  let busy = false;

  if (deckStack && !deckStack.children.length) {
    for (let i = 0; i < 11; i++) {
      const c = document.createElement('div');
      c.className = 'deck-card-mini';
      c.style.setProperty('--x', `${(i - 5) * .7}px`);
      c.style.setProperty('--r', `${(i - 5) * .32}deg`);
      deckStack.appendChild(c);
    }
  }

  const cards = ['tarotCard1','tarotCard2','tarotCard3'].map(id => document.getElementById(id));
  const revealCard = (card, idx) => {
    if (!drawnTarotCards[idx] || revealed.has(idx) || busy || !card.classList.contains('ready-to-flip')) return;
    card.classList.remove('ready-to-flip');
    card.classList.add('flipped');
    revealed.add(idx);
    sound.play('flip');
    if (revealed.size === 3) {
      submitBtn.disabled = false;
      deckHint.textContent = '三牌俱明 · 可呈递解读';
      resultDesc.style.display = 'block';
      resultDesc.innerHTML = `<strong>圣三角牌阵已揭示</strong><br>
        过去 · ${escapeHtml(drawnTarotCards[0].name)} ${drawnTarotCards[0].isReversed ? '逆位' : '正位'}<br>
        现在 · ${escapeHtml(drawnTarotCards[1].name)} ${drawnTarotCards[1].isReversed ? '逆位' : '正位'}<br>
        未来 · ${escapeHtml(drawnTarotCards[2].name)} ${drawnTarotCards[2].isReversed ? '逆位' : '正位'}`;
    } else {
      deckHint.textContent = `已揭示 ${revealed.size}/3 · 请继续亲手翻牌`;
    }
  };
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => revealCard(card, idx));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealCard(card, idx); }
    });
  });

  drawBtn.addEventListener('click', async () => {
    if (busy) return;
    busy = true; submitBtn.disabled = true; revealed.clear(); resultDesc.style.display = 'none';
    cards.forEach(c => c.classList.remove('flipped','ready-to-flip','dealt'));
    deckHint.textContent = '洗牌中 · 守住你最初的问题';
    deckStage?.classList.add('shuffling'); sound.play('shuffle');

    // Fisher-Yates，无放回抽牌。
    const shuffled = [...TAROT_DECK];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    drawnTarotCards = [
      { ...shuffled[0], isReversed: Math.random() > 0.68, slot: '过去' },
      { ...shuffled[1], isReversed: Math.random() > 0.68, slot: '现在' },
      { ...shuffled[2], isReversed: Math.random() > 0.68, slot: '未来' }
    ];

    await new Promise(r => setTimeout(r, 1450));
    deckStage?.classList.remove('shuffling');
    drawnTarotCards.forEach((info, idx) => {
      const front = document.getElementById('tarotFront' + (idx + 1));
      front.innerHTML = `<div class="card-num-badge">${escapeHtml(info.num)}</div><div class="card-name">${escapeHtml(info.name)}</div><div class="card-pos">${info.isReversed ? '【逆位】' : '【正位】'}</div>`;
      cards[idx].style.setProperty('--delay', `${idx * .12}s`);
      cards[idx].classList.add('dealt');
      setTimeout(() => cards[idx].classList.add('ready-to-flip'), 560 + idx * 120);
    });
    sound.play('tarot');
    deckHint.textContent = '牌已落位 · 请依次亲手翻开';
    drawBtn.innerHTML = '<i data-lucide="refresh-cw"></i> 重新洗牌';
    if (window.lucide) window.lucide.createIcons();
    busy = false;
  });

  submitBtn.addEventListener('click', () => {
    if (drawnTarotCards.length !== 3 || revealed.size !== 3) return;
    const q = document.getElementById('tarotQuestion').value.trim() || '求问当前困惑与走向';
    const cardLine = (card) => {
      const meaning = card.isReversed ? card.reversed : card.upright;
      return `${card.name}（${card.isReversed ? '逆位' : '正位'}）：${meaning}`;
    };
    const prompt = `【灵犀塔罗·圣三角牌阵问卜】\n所问心念：${q}\n牌阵排定：\n1. 过去因缘：${cardLine(drawnTarotCards[0])}\n2. 当下境遇：${cardLine(drawnTarotCards[1])}\n3. 未来走向：${cardLine(drawnTarotCards[2])}\n请严格依据以上正逆位含义解读，不要另抽一套牌。`;
    document.getElementById('modalTarot').classList.remove('show');
    handleSend(prompt);
  });
}

// ==================== 2. 周易六爻逻辑 ====================
let ichingLines = [];
function resetIchingBoard() {
  ichingLines = [];
  const tossBtn = document.getElementById('tossCoinBtn');
  const submitBtn = document.getElementById('submitIchingBtn');
  const tossStep = document.getElementById('tossStep');
  const hexLines = document.getElementById('hexagramLines');
  const resBox = document.getElementById('ichingResult');
  if (tossBtn) tossBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = true;
  if (tossStep) tossStep.textContent = '第 1 爻 / 共 6 爻';
  if (hexLines) hexLines.innerHTML = '';
  if (resBox) resBox.style.display = 'none';
  ['coin1', 'coin2', 'coin3'].forEach((id) => {
    document.getElementById(id)?.classList.remove('flipping');
  });
}
function initIchingLogic() {
  const tossBtn = document.getElementById('tossCoinBtn');
  const submitBtn = document.getElementById('submitIchingBtn');
  const tossStep = document.getElementById('tossStep');
  const hexLines = document.getElementById('hexagramLines');
  const resBox = document.getElementById('ichingResult');

  tossBtn.addEventListener('click', () => {
    if (ichingLines.length >= 6) return;
    sound.play('coin');

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
    const yaoMap = { 6: '老阴·动', 7: '少阳·静', 8: '少阴·静', 9: '老阳·动' };
    const yaoText = ichingLines.map((n, i) => `第${i + 1}爻 ${n}（${yaoMap[n] || n}）`).join('，');
    const prompt = `【周易六爻纳甲占断】\n问卜事由：${matter}\n六爻自初爻至上爻：${yaoText}\n请依 6 老阴、7 少阳、8 少阴、9 老阳排出本卦与变卦，再论动爻、六亲世应与趋避。不要另摇一套爻。`;
    document.getElementById('modalIching').classList.remove('show');
    resetIchingBoard();
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
  // 先天八卦，爻自下而上：1 阳 0 阴。乾兑离震巽坎艮坤。
  const guaLines = {
    1: [1, 1, 1], 2: [1, 1, 0], 3: [1, 0, 1], 4: [1, 0, 0],
    5: [0, 1, 1], 6: [0, 1, 0], 7: [0, 0, 1], 8: [0, 0, 0]
  };
  const linesToGua = (lines) => ({
    '111': 1, '110': 2, '101': 3, '100': 4, '011': 5, '010': 6, '001': 7, '000': 8
  }[lines.join('')] || 8);
  let currentMeihuaData = null;

  function showMeihuaResult(up, down, dong, mode) {
    const lower = guaLines[down] || guaLines[8];
    const upper = guaLines[up] || guaLines[1];
    const hex = [...lower, ...upper];
    const changed = hex.slice();
    changed[dong - 1] = changed[dong - 1] ? 0 : 1;
    const huDown = linesToGua([hex[1], hex[2], hex[3]]);
    const huUp = linesToGua([hex[2], hex[3], hex[4]]);
    const bianDown = linesToGua(changed.slice(0, 3));
    const bianUp = linesToGua(changed.slice(3, 6));
    const ti = dong > 3 ? down : up;
    const yong = dong > 3 ? up : down;

    currentMeihuaData = { up, down, dong, mode, huUp, huDown, bianUp, bianDown };
    sound.play('meihua');
    resPanel.style.display = 'block';
    resPanel.classList.remove('showing'); void resPanel.offsetWidth; resPanel.classList.add('showing');
    resPanel.querySelectorAll('.m-card').forEach((el,i)=>el.style.setProperty('--delay', `${i*.12}s`));
    document.getElementById('mBenName').textContent = `${guaNames[up]} / ${guaNames[down]}`;
    document.getElementById('mBenDesc').textContent = `动爻在第 ${dong} 爻`;
    document.getElementById('mHuName').textContent = `${guaNames[huUp]} / ${guaNames[huDown]}`;
    document.getElementById('mHuDesc').textContent = '二三四爻 / 三四五爻';
    document.getElementById('mBianName').textContent = `${guaNames[bianUp]} / ${guaNames[bianDown]}`;
    document.getElementById('mBianDesc').textContent = `第 ${dong} 爻已变`;
    document.getElementById('meihuaTiyong').innerHTML = `<strong>体用：</strong>体卦 ${escapeHtml(guaNames[ti])}，用卦 ${escapeHtml(guaNames[yong])}。以不动者为体，动爻所在为用。`;
    submitBtn.disabled = false;
  }

  submitBtn.addEventListener('click', () => {
    if (!currentMeihuaData) return;
    const prompt = `【梅花易数推演】\n起卦方式：${currentMeihuaData.mode}\n上卦数：${currentMeihuaData.up}，下卦数：${currentMeihuaData.down}，动爻：第${currentMeihuaData.dong}爻。\n本卦：上${guaNames[currentMeihuaData.up]} / 下${guaNames[currentMeihuaData.down]}\n互卦：上${guaNames[currentMeihuaData.huUp]} / 下${guaNames[currentMeihuaData.huDown]}\n变卦：上${guaNames[currentMeihuaData.bianUp]} / 下${guaNames[currentMeihuaData.bianDown]}\n请玄机子依梅花易数判定体用五行生克与应期时机。`;
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
  let rolling = false;

  rollBtn.addEventListener('click', () => {
    if (rolling) return;
    rolling = true; rollBtn.disabled = true; submitBtn.disabled = true;
    sound.play('xiaoliuren');
    let count = 0;
    const target = Math.floor(Math.random() * 6) + 1;
    const totalSteps = 18 + target;

    const timer = setInterval(() => {
      cells.forEach(c => c.classList.remove('active'));
      const activeIdx = (count % 6);
      cells[activeIdx].classList.add('active');
      if (count % 2 === 0) sound.play('tick');
      count++;
      if (count >= totalSteps) {
        clearInterval(timer);
        const finalCell = cells[(count - 1) % 6];
        const name = finalCell.querySelector('strong').textContent;
        const desc = finalCell.querySelector('span').textContent;
        selectedXlr = { name, desc };
        rolling = false; rollBtn.disabled = false;
        resPanel.style.display = 'block';
        resPanel.innerHTML = `<strong>掐指落宫：【${name}】</strong> — ${desc}`;
        submitBtn.disabled = false;
      }
    }, 60);
  });

  submitBtn.addEventListener('click', () => {
    const q = document.getElementById('xlrQuestion').value.trim() || '问近事吉凶';
    if (!selectedXlr) return;
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
    const y = Number(document.getElementById('bzYear').value);
    const m = Number(document.getElementById('bzMonth').value);
    const d = Number(document.getElementById('bzDay').value);
    const hourEl = document.getElementById('bzHour');
    const hourLabel = hourEl.options[hourEl.selectedIndex]?.text || hourEl.value;
    const gender = document.getElementById('bzGender').value;
    const city = document.getElementById('bzCity').value.trim();
    const nowYear = new Date().getFullYear();
    const checkDate = new Date(y, m - 1, d);
    const dateValid = checkDate.getFullYear() === y && checkDate.getMonth() === m - 1 && checkDate.getDate() === d;
    if (!y || y < 1900 || y > nowYear || !m || m < 1 || m > 12 || !d || !dateValid) {
      alert('请先填写有效的出生年月日。'); return;
    }
    sound.play('bazi');
    tableWrap.style.display = 'block';
    tableWrap.innerHTML = `<div class="bazi-review-card"><div class="bazi-review-seal">命</div><div><h4>${escapeHtml(gender)} · 公历 ${y}年${m}月${d}日 · ${escapeHtml(hourLabel)}</h4><p>${city ? `出生地：${escapeHtml(city)}。` : '尚未填写出生城市。'} 资料已录入；正式四柱、节气交接与真太阳时由后续推演校核，本页不会伪造干支结果。</p></div></div>`;
    submitBtn.disabled = false;
  });

  submitBtn.addEventListener('click', () => {
    const y = document.getElementById('bzYear').value;
    const m = document.getElementById('bzMonth').value;
    const d = document.getElementById('bzDay').value;
    const hourEl = document.getElementById('bzHour');
    const hourLabel = hourEl.options[hourEl.selectedIndex]?.text || hourEl.value;
    const gender = document.getElementById('bzGender').value;
    const city = document.getElementById('bzCity').value;
    if (!y || !m || !d) { alert('请先完整填写出生年月日。'); return; }
    const prompt = `【四柱八字精批】\n造化：${gender}\n公历生辰：${y}年${m}月${d}日 ${hourLabel}\n出生地：${city}\n请玄机子先说明历法校核依据，再尝试依节气与出生地校核四柱；若无法可靠完成真太阳时或干支换算，必须明确标注不确定处，不得虚构。随后再讨论日主五行、十神格局、喜忌与阶段性趋势。`;
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
  let shaking = false;

  const lots = [
    { num: 1, title: '第一签 · 上上', poem: '巍巍独步向云间，玉兔升天渐觉圆。\n读画看书自清泰，贵人相引上青天。', desc: '求名遂意，作事有成。' },
    { num: 8, title: '第八签 · 上吉', poem: '年喜秋成稻谷香，行舟乘风好过江。\n逢凶化吉安然度，正是东君照日光。', desc: '顺风行船，逢凶化吉。' },
    { num: 16, title: '第十六签 · 中吉', poem: '静坐幽室思过往，莫向长空怨风霜。\n若待春雷惊百蛰，潜龙脱困自飞扬。', desc: '蓄势待发，静候时机。' },
    { num: 28, title: '第二十八签 · 见机', poem: '雾锁孤山路径迷，偶逢樵子指云梯。\n莫将小忿伤大雅，谦逊从容万事吉。', desc: '谦和守中，自有贵人。' }
  ];

  shakeBtn.addEventListener('click', () => {
    if (shaking) return;
    shaking = true; shakeBtn.disabled = true; submitBtn.disabled = true;
    sound.play('lot');
    cylinder.classList.remove('ritual-shake'); void cylinder.offsetWidth; cylinder.classList.add('ritual-shake');
    setTimeout(() => {
      cylinder.classList.remove('ritual-shake');
      currentLot = lots[Math.floor(Math.random() * lots.length)];
      poemCard.style.display = 'block';
      poemCard.innerHTML = `
        <div style="background:rgba(199,62,29,0.12);border:1px solid var(--cinnabar);border-radius:8px;padding:14px;margin-top:12px;">
          <h4 style="color:#ff7854;margin-bottom:6px;">${currentLot.title}</h4>
          <p style="font-family:var(--font-serif);font-size:14px;color:#fdfbf7;line-height:1.8;margin-bottom:8px;">${currentLot.poem.replace(/\n/g, '<br>')}</p>
          <div style="font-size:12px;color:var(--gold);">${currentLot.desc}</div>
        </div>
      `;
      shaking = false; shakeBtn.disabled = false; submitBtn.disabled = false;
    }, 1350);
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
    sound.play('muyu');
    wood.classList.remove('hit'); void wood.offsetWidth; wood.classList.add('hit');
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
      sound.play('dream');
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
  const weekday = '日一二三四五六'[d.getDay()];
  content.innerHTML = `
    <div class="almanac-sheet">
      <div class="almanac-date-mark"><small>${d.getFullYear()}</small><strong>${String(d.getMonth()+1).padStart(2,'0')}·${String(d.getDate()).padStart(2,'0')}</strong><span>星期${weekday}</span></div>
      <div class="almanac-pending"><b>今日宜忌待推演</b><p>黄历干支、值神、冲煞与宜忌不能仅凭公历日期在前端硬编码。本页只确认日期，点击下方后再由推演线路给出参考。</p></div>
    </div>`;

  const btn = document.getElementById('queryAlmanacDayBtn');
  btn.addEventListener('click', () => {
    sound.play('almanac');
    document.getElementById('modalAlmanac').classList.remove('show');
    handleSend(`【择吉黄历】请以 ${dateStr}（星期${weekday}）为基准，先核对该日干支、值神与冲煞，再分别列出宜、忌及行事趋避。若无法可靠校历，请明确说明不确定处，不要编造。`);
  });
}

// ==================== 10. 符笺海报 Canvas 生成 ====================
function openPosterModal(text) {
  const modal = document.getElementById('modalPoster');
  modal.classList.add('show');
  sound.play('poster');

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

// ==================== 氛围与微交互 ====================
function initAtmosphere() {
  const intro = document.getElementById('ritualIntro');
  setTimeout(() => intro?.classList.add('hide'), 1750);

  // 同步声音按钮初始状态。
  if (soundIcon) soundIcon.setAttribute('data-lucide', sound.enabled ? 'volume-2' : 'volume-x');

  // 法门卡片采用轻微视差，不做廉价大幅 3D 旋转。
  document.querySelectorAll('.door-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX-r.left}px`);
      card.style.setProperty('--my', `${e.clientY-r.top}px`);
    });
    card.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && card.dataset.tool) { e.preventDefault(); openToolModal(card.dataset.tool); }
    });
  });

  // 首次真实点击后解锁 WebAudio；浏览器不会允许自动播放。
  document.addEventListener('pointerdown', () => sound.init(), { once:true, passive:true });
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
