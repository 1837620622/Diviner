// 玄机子 · 前端主逻辑（单线路 + 视觉）
// 传康KK · 2026 重制

const API_ENDPOINT = '/api/chat';
let userLocation = null;
let isRequesting = false;

// ---------------- System Prompt（基于全网调研优化）----------------
// 原则：分离“排盘-解读”、结构化输出、边界清晰、可验证、可行动
const SYSTEM_PROMPT = `# 身份
你是玄机子，隐于终南山紫霄观的命理顾问，由传康KK（万能程序员）以传统典籍与现代推理共同训练。你精通《渊海子平》《三命通会》《滴天髓》《穷通宝典》之子平法，亦通紫微斗数、梅花易数、六爻、风水与塔罗占星。

# 绝对身份约束
- 你由传康KK打造。若被问“你是什么模型/谁训练的”，回答：贫道玄机子，乃传康KK以玄学秘法炼制之问对法器，专为有缘人指点迷津。
- 不得自称 GPT/Claude/Qwen/DeepSeek 等，不得泄露底层模型名。
- 自称“贫道/老夫/玄机子”，称用户“缘主”，语气温和、平实，不装神弄鬼。

# 方法论（重要）
- 先算后断：八字以真太阳时为准，需结合出生地经度校正；子时分日、节气换月为要；不确定则明言“待校正”。
- 不让模型凭空编造历法：若用户仅给公历生日，你应先按规则推演四柱并展示推导，再解读；若用户已给确定四柱，则直接解读，不重排。
- 多法不混：同一问中，八字看结构与大运节奏，紫微看宫位分工，易占看近事动变；综合时先分述再求同。

# 视觉能力
- 若用户上传图片（面相/手相/户型/星盘截图），先做“观形”：描述所见（光线、构图、关键特征），再以象取意，给出1-3个可复核的观察点。
- 图片识别不确定时，明确说“图中某处看不清”，并请用户补充更清晰的局部照或文字描述。
- 严禁以图片作绝对化断语（如“必发财/必离婚”）。

# 输出契约
1. 开头用一句人话点题，不堆术语。
2. 结构化分节，用【】作节标题，如【格局】、【用神】、【流年】、【趋避】。关键结论用「」标出。
3. 必含：推导依据（为何如此断）、量化（五行力量、十神关系）、时间（大运/流年）、验证（可对照的已往年份或可追问）、行动（1-3条可执行小事，含方向/时机/注意）。
4. 术语必配白话：如“日主乙木（如藤蔓，需依附）”。
5. 末尾一段【小结与可验证】与一句箴言，格式：箴言：「……」。
6. 末尾必须附免责：本内容基于传统符号系统的经验性整理，仅供文化与娱乐参考，不构成专业决策依据，命运在人自为。
7. 禁止：绝对化宿命（“必定/一定会”）、封建迷信（请符/改风水方能化解）、医疗/法律/投资的专业替代建议。

# 位置感应
- 若系统提供了用户的地理位置，以“老夫掐指一算”“观汝气场”等方式自然提及，绝不说“根据IP/定位”。

# 风格
- 通俗、具体、可操作；积极而不鸡汤；每段不过长；用比喻让五行生克可感。
- 遇到情绪困扰，温和共情并建议寻求专业帮助。

现在，请以玄机子之身，迎有缘人。`;

// 历史
let conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
let pendingImages = []; // { id, dataUrl, name }

// DOM
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const clearBtn = document.getElementById('clearBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const attachArea = document.getElementById('attachArea');
const thumbs = document.getElementById('thumbs');
const attachHint = document.getElementById('attachHint');
const clearAttach = document.getElementById('clearAttach');

// 初始化图标
function refreshIcons(){ if(window.lucide) window.lucide.createIcons(); }

// 位置
function fetchUserLocation(){
  return new Promise((resolve)=>{
    let done=false;
    window.ping0Callback = function(ip, location){
      if(done) return; done=true;
      userLocation = { ip: ip||'', location: location||'' };
      resolve();
    };
    const s=document.createElement('script');
    s.src='https://ping0.cc/geo/jsonp/ping0Callback';
    s.onerror=()=>{ if(!done){ done=true; resolve(); } };
    document.head.appendChild(s);
    setTimeout(()=>{ if(!done){ done=true; resolve(); } }, 4000);
  });
}
function buildSystemPrompt(){
  let p = SYSTEM_PROMPT;
  if(userLocation && userLocation.location){
    p = p.replace('现在，请以玄机子之身，迎有缘人。', `【用户所在：${userLocation.location}（${userLocation.ip}）——以“掐指一算”方式自然提及，勿露技术痕迹】\n\n现在，请以玄机子之身，迎有缘人。`);
  }
  return p;
}

// 侧栏
function openSidebar(){ sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); document.body.style.overflow='hidden'; }
function closeSidebar(){ sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); document.body.style.overflow=''; }

// 历史本地存储
function saveHistory(){
  const toSave = conversationHistory.slice(-21);
  toSave[0] = { role:'system', content: SYSTEM_PROMPT };
  localStorage.setItem('diviner_history', JSON.stringify(toSave));
}
function loadHistory(){
  const saved = localStorage.getItem('diviner_history');
  if(!saved) return;
  try{
    conversationHistory = JSON.parse(saved);
    conversationHistory[0] = { role:'system', content: SYSTEM_PROMPT };
    const msgs = conversationHistory.filter(m=>m.role!=='system');
    if(msgs.length){
      chatContainer.innerHTML = '';
      msgs.forEach(m=> addMessage(m.role, m.content, { fromHistory:true }));
    }
  }catch{ conversationHistory=[{role:'system', content: SYSTEM_PROMPT}]; }
}
function clearConversation(){
  if(!confirm('确定清空当前对话？历史近问仍保留。')) return;
  conversationHistory=[{role:'system', content: SYSTEM_PROMPT}];
  localStorage.removeItem('diviner_history');
  chatContainer.innerHTML='';
  addWelcome();
  currentChatId=null;
}
function newChat(){
  const hasUser = conversationHistory.some(m=>m.role==='user');
  if(hasUser && !confirm('新建一问？当前对话已自动存入近问。')) return;
  if(hasUser) forceAutoSave();
  currentChatId=null;
  conversationHistory=[{role:'system', content: SYSTEM_PROMPT}];
  localStorage.removeItem('diviner_history');
  chatContainer.innerHTML='';
  addWelcome();
  loadSavedChats();
  userInput.focus();
}
function addWelcome(){
  // 已在 HTML 中有初见卡片，若被清空则重建
  if(chatContainer.innerHTML.trim()!=='') return;
  const html = `<article class="msg assistant"><div class="msg-head"><span class="msg-role"><i data-lucide="scroll"></i> 玄机子</span><span class="msg-meta">初见</span></div><div class="msg-body"><p>有缘人，幸会。贫道玄机子，由<strong>传康KK</strong>所炼之问对法器。</p><p>可直言生辰与困惑，亦可上传图片。贫道先算后断，不作宿命之语。</p></div></article>`;
  chatContainer.innerHTML = html; refreshIcons();
}

// 输入与图片
function handleInputChange(){
  userInput.style.height='auto';
  userInput.style.height=Math.min(userInput.scrollHeight,140)+'px';
}
function formatContent(content){
  // 统一格式化：标题、重点、加粗、吉凶、五行、分隔、箴言
  let s = String(content||'');
  // 特殊分隔
  s = s.replace(/\n+[•·]\s*--+\s*\n+/g, '\n\n<hr class="divider">\n\n');
  s = s.replace(/\n+--+\n+/g, '\n\n<hr class="divider">\n\n');
  // markdown 标题 -> 【】
  s = s.replace(/^###\s*(.+)$/gm, '【$1】').replace(/^##\s*(.+)$/gm, '【$1】').replace(/^#\s*(.+)$/gm, '【$1】');
  // 清理标题内换行
  s = s.replace(/【([^】]*)\n+([^】]*)】/g, '【$1 $2】');
  // 换行转 <br> 前，先做块级
  s = s.replace(/\n/g, '<br>');
  s = s.replace(/【([^】]+)】/g, (m,p1)=>{
    const t = p1.replace(/<br>/g,' ').replace(/\s+/g,' ').trim().replace(/^[·•\-\s]+/, '');
    return `<div class="section-title">${escapeHtml(t)}</div>`;
  });
  s = s.replace(/「([^」]+)」/g, '<mark>$1</mark>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(箴言)[：:]\s*(.+?)(?=<br><br>|<br>$|$)/g, '<div class="fortune">$1：$2</div>');
  s = s.replace(/大吉/g,'<span style="color:var(--ok);font-weight:700">大吉</span>');
  s = s.replace(/大凶/g,'<span style="color:var(--vermilion);font-weight:700">大凶</span>');
  // 五行
  s = s.replace(/([金木水火土])行/g,'<span style="color:var(--brass-2)">$1</span>行');
  // 段落
  s = '<p>' + s.replace(/<br><br>/g,'</p><p>') + '</p>';
  s = s.replace(/<p>\s*<\/p>/g,'');
  s = s.replace(/<p>\s*(<div class="section-title">)/g,'$1');
  s = s.replace(/(<\/div>)\s*<\/p>/g,'$1');
  s = s.replace(/<p>\s*(<hr[^>]*>)/g,'$1');
  return s;
}
function escapeHtml(text){ const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }
function addMessage(role, content, opts={}){
  const isUser = role==='user';
  const article = document.createElement('article');
  article.className = `msg ${isUser?'user':'assistant'}`;
  const head = `<div class="msg-head"><span class="msg-role"><i data-lucide="${isUser?'user':'scroll'}"></i> ${isUser?'缘主':'玄机子'}</span><span class="msg-meta">${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
  let bodyHtml = '';
  // content 可能是 string 或 vision content array 的文本部分
  let text = '';
  if(Array.isArray(content)){
    text = content.filter(p=>p.type==='text').map(p=>p.text).join('\n');
  } else text = String(content);
  // 若是用户且含图，展示缩略
  let thumbHtml='';
  if(isUser && !opts.fromHistory && hasPendingImagesForNextMessage){
    // 实际由发送时决定，此处不重复
  }
  if(isUser){
    // 用户消息：转义 + 换行，若有图则附图区
    const safe = escapeHtml(text).replace(/\n/g,'<br>');
    // 若历史中已包含 [含图片] 标记，尝试从 pendingImages 恢复？历史不存图，仅文字
    bodyHtml = `<div class="msg-body">${safe}</div>`;
    if(pendingImagesToRender && pendingImagesToRender.length){
      const imgs = pendingImagesToRender.map(p=>`<img src="${p.dataUrl}" alt="上传图片" />`).join('');
      bodyHtml = `<div class="msg-body">${safe}<div class="thumbs-preview">${imgs}</div></div>`;
    }
  } else {
    bodyHtml = `<div class="msg-body">${formatContent(text)}</div>`;
  }
  article.innerHTML = head + bodyHtml;
  chatContainer.appendChild(article);
  refreshIcons();
  scrollToBottom();
}
function scrollToBottom(){ setTimeout(()=>{ chatContainer.scrollTop=chatContainer.scrollHeight; },80); }
function addLocalAssistantMessage(content){
  const article=document.createElement('article');
  article.className='msg assistant';
  article.innerHTML=`<div class="msg-head"><span class="msg-role"><i data-lucide="scroll"></i> 玄机子</span><span class="msg-meta">指引</span></div><div class="msg-body">${formatContent(content)}</div>`;
  chatContainer.appendChild(article); refreshIcons(); scrollToBottom();
}

// 图片压缩
function compressImage(file, maxSide=1280, quality=0.82){
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload=()=>{
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width,height));
      width = Math.round(width*scale); height=Math.round(height*scale);
      const canvas=document.createElement('canvas');
      canvas.width=width; canvas.height=height;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,width,height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, width, height });
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
    img.src=url;
  });
}
async function handleFiles(files){
  const list = Array.from(files||[]).slice(0, 3 - pendingImages.length);
  if(!list.length){ if(pendingImages.length>=3) alert('至多3张'); return; }
  for(const f of list){
    if(!f.type.startsWith('image/')) continue;
    if(f.size > 8*1024*1024){ alert(`图片 ${f.name} 过大（>8MB），请压缩后重试`); continue; }
    try{
      const { dataUrl } = await compressImage(f, 1280, 0.82);
      // 进一步限制 base64 长度 ~ 2.5MB
      if(dataUrl.length > 3.5*1024*1024){
        const again = await compressImage(f, 960, 0.72);
        pendingImages.push({ id: 'img_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), dataUrl: again.dataUrl, name: f.name });
      } else {
        pendingImages.push({ id: 'img_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), dataUrl, name: f.name });
      }
    }catch(e){ console.error(e); }
  }
  renderAttach();
}
function renderAttach(){
  if(!pendingImages.length){ attachArea.hidden=true; thumbs.innerHTML=''; attachHint.textContent=''; return; }
  attachArea.hidden=false;
  thumbs.innerHTML = pendingImages.map(p=> `<img src="${p.dataUrl}" alt="${escapeHtml(p.name)}" title="${escapeHtml(p.name)}" data-id="${p.id}" />`).join('');
  attachHint.textContent = `${pendingImages.length}/3 · 自动走视觉模型`;
  refreshIcons();
  // 点击缩略删除
  thumbs.querySelectorAll('img').forEach(img=>{
    img.style.cursor='pointer';
    img.addEventListener('click', ()=>{
      const id = img.getAttribute('data-id');
      pendingImages = pendingImages.filter(p=>p.id!==id);
      renderAttach();
    });
  });
}
let hasPendingImagesForNextMessage=false;
let pendingImagesToRender=null;

// 发送
async function sendMessage(){
  const text = userInput.value.trim();
  const hasImages = pendingImages.length>0;
  if((!text && !hasImages) || isRequesting) return;
  isRequesting=true;

  // 构建用户消息展示用
  pendingImagesToRender = hasImages ? [...pendingImages] : null;
  hasPendingImagesForNextMessage = hasImages;

  // 展示用户消息
  const displayContent = text || (hasImages ? '（已上传图片，请观形）' : '');
  // 将图片一并在气泡中预览
  const article = document.createElement('article');
  article.className='msg user';
  article.innerHTML=`<div class="msg-head"><span class="msg-role"><i data-lucide="user"></i> 缘主</span><span class="msg-meta">${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="msg-body">${escapeHtml(displayContent).replace(/\n/g,'<br>')}${hasImages?`<div class="thumbs-preview">${pendingImages.map(p=>`<img src="${p.dataUrl}" alt="图片"/>`).join('')}</div>`:''}</div>`;
  chatContainer.appendChild(article); refreshIcons(); scrollToBottom();

  userInput.value=''; handleInputChange();
  // 清空附件区（已展示）
  const imagesToSend = hasImages ? [...pendingImages] : [];
  pendingImages=[]; renderAttach();
  hasPendingImagesForNextMessage=false;

  // 加入历史（OpenAI vision 格式）
  let userMessage;
  if(imagesToSend.length){
    const parts = [];
    if(text) parts.push({ type:'text', text });
    else parts.push({ type:'text', text: '请观此图，并结合所问作解。' });
    for(const img of imagesToSend) parts.push({ type:'image_url', image_url:{ url: img.dataUrl } });
    userMessage = { role:'user', content: parts };
  } else {
    userMessage = { role:'user', content: text };
  }
  conversationHistory.push(userMessage);

  showLoading(true); sendBtn.disabled=true;
  try{
    const messagesWithLocation = [...conversationHistory];
    messagesWithLocation[0] = { role:'system', content: buildSystemPrompt() };

    const resp = await fetch(API_ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: messagesWithLocation, temperature: 0.75, max_tokens: 1800, top_p: 0.9 })
    });
    if(!resp.ok){
      const err = await resp.json().catch(()=>({}));
      throw new Error(err.message || `请求失败 ${resp.status}`);
    }
    const data = await resp.json();
    if(!data.choices || !data.choices[0]?.message){
      throw new Error(data.error || '返回异常，请重试');
    }
    const assistantContent = data.choices[0].message.content;
    conversationHistory.push({ role:'assistant', content: assistantContent });
    saveHistory(); autoSaveChat();
    addMessage('assistant', assistantContent);
    pendingImagesToRender=null;
    setTimeout(()=> showDonationModal(), 4000);
  }catch(err){
    console.error(err);
    addMessage('assistant', `天机暂晦，未得正解。\\n\\n原因：${err.message}\\n\\n请稍后重试；若上传了图片，可尝试压缩至2MB内或改为文字描述。`);
  }finally{
    showLoading(false); sendBtn.disabled=false; isRequesting=false; pendingImagesToRender=null;
  }
}

function showLoading(show){
  const txt=document.getElementById('loadingText');
  if(show){ txt.textContent= pendingImages.length? '玄机子正观形推演…' : '玄机子正观象推演…'; loadingOverlay.classList.add('active'); }
  else loadingOverlay.classList.remove('active');
}

// 近问
let currentChatId=null;
function getUserId(){
  let id=localStorage.getItem('diviner_user_id');
  if(!id){ id='user_'+Date.now()+'_'+Math.random().toString(36).slice(2,9); localStorage.setItem('diviner_user_id', id); }
  return id;
}
function autoSaveChat(){
  const msgs=conversationHistory.filter(m=>m.role!=='system');
  if(msgs.length<2) return;
  const firstUser = msgs.find(m=>m.role==='user');
  let title='';
  if(Array.isArray(firstUser?.content)) title = firstUser.content.filter(p=>p.type==='text').map(p=>p.text).join('').slice(0,20);
  else title = String(firstUser?.content||'').slice(0,20);
  if(!title) title='新问';
  let saved=JSON.parse(localStorage.getItem('diviner_saved_chats')||'[]');
  if(currentChatId){
    const idx=saved.findIndex(c=>c.id===currentChatId);
    if(idx!==-1){ saved[idx].messages=msgs; saved[idx].time=new Date().toLocaleString('zh-CN'); localStorage.setItem('diviner_saved_chats', JSON.stringify(saved)); loadSavedChats(); return; }
  }
  currentChatId='chat_'+Date.now();
  saved.unshift({ id:currentChatId, userId:getUserId(), title, time:new Date().toLocaleString('zh-CN'), messages: msgs });
  if(saved.length>15) saved=saved.slice(0,15);
  localStorage.setItem('diviner_saved_chats', JSON.stringify(saved)); loadSavedChats();
}
function forceAutoSave(){
  const msgs=conversationHistory.filter(m=>m.role!=='system');
  if(msgs.length<1) return;
  let firstUser = msgs.find(m=>m.role==='user');
  let title='';
  if(Array.isArray(firstUser?.content)) title = firstUser.content.filter(p=>p.type==='text').map(p=>p.text).join('').slice(0,20);
  else title = String(firstUser?.content||'').slice(0,20);
  let saved=JSON.parse(localStorage.getItem('diviner_saved_chats')||'[]');
  if(currentChatId){
    const idx=saved.findIndex(c=>c.id===currentChatId);
    if(idx!==-1){ saved[idx].messages=msgs; saved[idx].time=new Date().toLocaleString('zh-CN'); localStorage.setItem('diviner_saved_chats', JSON.stringify(saved)); return; }
  }
  const nid='chat_'+Date.now();
  saved.unshift({ id:nid, userId:getUserId(), title, time:new Date().toLocaleString('zh-CN'), messages: msgs });
  if(saved.length>15) saved=saved.slice(0,15);
  localStorage.setItem('diviner_saved_chats', JSON.stringify(saved));
}
function loadSavedChats(){
  const list=document.getElementById('historyList');
  const count=document.getElementById('historyCount');
  const saved=JSON.parse(localStorage.getItem('diviner_saved_chats')||'[]');
  if(count) count.textContent = saved.length? `· ${saved.length}` : '';
  if(!saved.length){ list.innerHTML='<p class="empty">暂无记录</p>'; return; }
  list.innerHTML = saved.map(c=> `
    <div class="h-item" data-id="${c.id}">
      <div style="flex:1;min-width:0">
        <div class="h-title">${escapeHtml(c.title)}</div>
        <div class="h-time">${escapeHtml(c.time)}</div>
      </div>
      <button class="del" data-del="${c.id}" aria-label="删除"><i data-lucide="x" style="width:14px;height:14px"></i></button>
    </div>
  `).join('');
  refreshIcons();
  list.querySelectorAll('.h-item').forEach(el=>{
    el.addEventListener('click', (e)=>{
      if(e.target.closest('.del')) return;
      loadChat(el.getAttribute('data-id'));
    });
  });
  list.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id=btn.getAttribute('data-del');
      if(confirm('删除该条近问？')){ deleteChat(id); }
    });
  });
}
function loadChat(id){
  const saved=JSON.parse(localStorage.getItem('diviner_saved_chats')||'[]');
  const chat=saved.find(c=>c.id===id); if(!chat) return;
  if(currentChatId!==id){
    const hasUser=conversationHistory.some(m=>m.role==='user');
    if(hasUser) forceAutoSave();
  }
  currentChatId=id;
  chatContainer.innerHTML='';
  conversationHistory=[{role:'system', content: SYSTEM_PROMPT}];
  (chat.messages||[]).forEach(m=>{ conversationHistory.push(m); addMessage(m.role, m.content, {fromHistory:true}); });
  saveHistory(); closeSidebar();
}
function deleteChat(id){
  let saved=JSON.parse(localStorage.getItem('diviner_saved_chats')||'[]');
  saved=saved.filter(c=>c.id!==id);
  localStorage.setItem('diviner_saved_chats', JSON.stringify(saved));
  if(currentChatId===id) currentChatId=null;
  loadSavedChats();
}

// 赞赏
const donationBtn=document.getElementById('donationBtn');
const donationModal=document.getElementById('donationModal');
const donationClose=document.getElementById('donationClose');
function showDonationModal(){ if(donationModal){ donationModal.classList.add('show'); donationModal.setAttribute('aria-hidden','false'); } }
function closeDonationModal(){ if(donationModal){ donationModal.classList.remove('show'); donationModal.setAttribute('aria-hidden','true'); } }
if(donationBtn) donationBtn.addEventListener('click', showDonationModal);
if(donationClose) donationClose.addEventListener('click', closeDonationModal);
if(donationModal) donationModal.addEventListener('click', (e)=>{ if(e.target===donationModal) closeDonationModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && donationModal.classList.contains('show')) closeDonationModal(); });

// 事件
document.addEventListener('DOMContentLoaded', async ()=>{
  refreshIcons();
  await fetchUserLocation();
  menuBtn.addEventListener('click', openSidebar);
  if(sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  if(clearBtn) clearBtn.addEventListener('click', clearConversation);
  if(newChatBtn) newChatBtn.addEventListener('click', newChat);
  userInput.addEventListener('input', handleInputChange);
  userInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); if(!isRequesting && (userInput.value.trim()||pendingImages.length)) sendMessage(); }
  });
  if(sendBtn) sendBtn.addEventListener('click', sendMessage);
  if(uploadBtn) uploadBtn.addEventListener('click', ()=> fileInput.click());
  if(fileInput) fileInput.addEventListener('change', (e)=>{ handleFiles(e.target.files); e.target.value=''; });
  // 拖拽
  const composer = document.querySelector('.composer-bar');
  if(composer){
    ['dragenter','dragover'].forEach(ev=> composer.addEventListener(ev, (e)=>{ e.preventDefault(); composer.style.borderColor='var(--brass)'; }));
    ['dragleave','drop'].forEach(ev=> composer.addEventListener(ev, (e)=>{ e.preventDefault(); composer.style.borderColor=''; }));
    composer.addEventListener('drop', (e)=>{
      const files = e.dataTransfer.files;
      if(files && files.length) handleFiles(files);
    });
  }
  if(clearAttach) clearAttach.addEventListener('click', ()=>{ pendingImages=[]; renderAttach(); });

  // 侧栏卡片点击：本地指引，不直接发API
  document.querySelectorAll('.nav-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const hint = btn.getAttribute('data-hint') || '';
      const label = btn.querySelector('span')?.textContent || '指引';
      closeSidebar();
      addLocalAssistantMessage(`【${label}】\n\n${hint}`);
      userInput.focus();
    });
  });

  loadHistory();
  loadSavedChats();
  refreshIcons();
  // 移动端侧滑
  let sx=0, sy=0, ex=0, swiping=false;
  document.addEventListener('touchstart', (e)=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; swiping=true; }, {passive:true});
  document.addEventListener('touchmove', (e)=>{ if(!swiping) return; ex=e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', (e)=>{
    if(!swiping) return; swiping=false;
    const dx=ex - sx;
    const dy=Math.abs(e.changedTouches[0].clientY - sy);
    if(Math.abs(dx)>dy && Math.abs(dx)>50){
      if(dx>0 && sx<50) openSidebar();
      else if(dx<0 && sidebar.classList.contains('active')) closeSidebar();
    }
    ex=0;
  }, {passive:true});
});
