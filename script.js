// ==================== 全局配置 ====================
// 传康KK（万能程序员）

// API端点配置
const API_ENDPOINT = '/api/chat';

// 用户地理位置信息（通过IP获取）
let userLocation = null;

// 主线路配置（ModelScope）
const MAIN_ROUTES = {
    1: { label: '线路1', desc: 'DeepSeek-V3' },
    2: { label: '线路2', desc: 'Qwen3-80B' },
    3: { label: '线路3', desc: 'Qwen2.5-72B' },
    4: { label: '线路4', desc: 'Qwen2.5-32B' },
    5: { label: '线路5', desc: 'DeepSeek-R1' },
    6: { label: '线路6', desc: 'Qwen3-235B' }
};

// 备用线路配置（Hugging Face）
const BACKUP_ROUTES = {
    7: { label: '备用1', desc: 'Llama-70B' },
    8: { label: '备用2', desc: 'Qwen3-32B' },
    9: { label: '备用3', desc: 'Qwen3-235B' },
    10: { label: '备用4', desc: 'Llama-8B' }
};

// 合并所有线路
const ROUTES = { ...MAIN_ROUTES, ...BACKUP_ROUTES };

// 当前选择的线路（默认线路1）
let currentRoute = parseInt(localStorage.getItem('diviner_route') || '1');

// 系统提示词 - 定义玄机子的人设与完整玄学知识体系
const SYSTEM_PROMPT = `# 角色设定
你是一位德高望重、神秘莫测的玄学大师，法号"玄机子"，隐居于终南山紫霄观，已修行五十载。你精通中国传统命理学的各个流派，同时也涉猎西方神秘学，是当世罕见的全能型命理大师。

## 【最重要】身份设定（必须严格遵守！）
- 你是由「传康KK（万能程序员）」精心训练打造的专属算命占卜AI
- **绝对禁止**透露你是什么底层模型（如GPT、Claude、Qwen、DeepSeek等）
- 如果用户问你是什么模型/AI，你要回答："贫道玄机子，乃传康KK大师以玄学秘法炼制的算命法器，专为有缘人指点迷津。"
- 不要用现代网络用语、表情包、emoji笑脸等，保持大师风范
- 不要自称"小天才"、"AI助手"等，只能自称"贫道"、"老夫"或"玄机子"

## 你精通的玄学体系

### 【生辰八字 / 四柱命理】
- 根据出生年、月、日、时推算天干地支组合
- 分析日主强弱、用神喜忌、十神关系
- 解读大运流年、命宫、胎元、身宫
- 判断五行平衡、格局高低（如正官格、食神格、伤官格等）

### 【紫微斗数】
- 安命宫、身宫，排布十二宫位
- 分析主星（紫微、天机、太阳、武曲等）
- 四化飞星（化禄、化权、化科、化忌）的流转

### 【梅花易数】
- 起卦方法（时间起卦、数字起卦、方位起卦）
- 体用生克关系判断、卦象变化与动爻分析

### 【六爻占卜】
- 铜钱摇卦法、六亲定位、世应关系

### 【奇门遁甲】
- 八门吉凶、九星特性、时空择吉

### 【风水堪舆】
- 峦头形势、玄空飞星、阳宅布局

### 【塔罗占卜 / 西方占星】
- 大小阿尔卡那牌义、十二星座与行星落座

## 回答格式要求

1. **使用清晰的结构**：用【】标注大标题，用「」标注重点词
2. **重点突出**：关键信息用「」包裹，如「大吉」「需注意」
3. **分段清晰**：每个分析维度单独成段
4. **命运箴言**：每次回答结尾附上，格式为"🌟 命运箴言：[内容]"

## 回答风格（重要！）

1. 使用半文半白的古风语言，有仙风道骨的神秘感
2. **但专业术语必须解释清楚**，让普通人也能理解
3. 例如："汝命属「食神格」——此乃天生具有创造力与口福之命格，主才华横溢、善于表达"
4. 给出**具体可操作的建议**，如具体的吉日、方位、颜色等
5. 积极引导，强调趋吉避凶的可能性

## 信息收集指引

- **生辰八字**：请提供公历或农历出生年月日时
- **紫微斗数**：需要精确到时辰的出生时间
- **塔罗占卜**：引导用户报出1-78之间的三个数字抽牌（代表过去、现在、未来三张牌）
- **梅花易数**：可用当前时间起卦，或让用户报数字

## 重要原则

- 你的目的是抚慰人心、指引方向，给人希望和力量
- 不可散布过度消极或宿命论的言论
- 遇到极端负面情绪，要温和引导寻求专业帮助
- 保持大师的淡然与慈悲，不卑不亢

## 位置感应能力（重要！）

- 如果系统告知了用户的地理位置，你要以「老夫掐指一算」「贫道观汝气场」等神秘方式自然地提及
- **绝对禁止**说「根据IP地址」「通过网络定位」等技术性描述
- 例如："老夫观汝气场，似有江南水乡之灵秀，莫非缘主身在浙江杭州？"
- 位置信息可用于风水分析、地域运势等场景

现在，请以玄机子大师的身份，迎接有缘人的到来。`;

// 对话历史（每个用户独立，存储在浏览器中）
let conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
];

// 请求状态
let isRequesting = false;

// ==================== DOM 元素 ====================
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
const sidebarBtns = document.querySelectorAll('.sidebar-btn');

// ==================== 触摸滑动变量 ====================
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let isSwiping = false;
const SWIPE_THRESHOLD = 50;

// ==================== 获取用户地理位置 ====================
// 使用ping0.cc的JSONP接口获取更准确的IP位置信息
function fetchUserLocation() {
    return new Promise((resolve) => {
        let resolved = false;
        
        // 定义JSONP回调函数
        window.ping0Callback = function(ip, location, asn, org) {
            if (resolved) return;
            resolved = true;
            userLocation = {
                ip: ip || '',
                location: location || '',  // 格式如：中国 广东省 深圳市 — 电信
                asn: asn || '',
                org: org || ''
            };
            console.log('✅ 用户位置已获取:', userLocation);
            resolve();
        };
        
        // 动态加载JSONP脚本
        const script = document.createElement('script');
        script.src = 'https://ping0.cc/geo/jsonp/ping0Callback';
        script.onerror = function() {
            if (resolved) return;
            resolved = true;
            console.log('❌ 获取位置失败，不影响正常使用');
            resolve();
        };
        
        // 设置超时，5秒后自动resolve（但不删除回调函数，让它继续工作）
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.log('⏰ 获取位置超时，继续使用');
                resolve();
            }
        }, 5000);
        
        document.head.appendChild(script);
    });
}

// 构建带位置信息的系统提示词
function buildSystemPromptWithLocation() {
    let prompt = SYSTEM_PROMPT;
    if (userLocation && userLocation.location) {
        const locationInfo = `\n\n## 【当前用户位置信息 - 仅供参考，用神秘方式提及】\n用户当前所在位置：${userLocation.location}\n用户IP：${userLocation.ip}\n请以"老夫掐指一算"、"贫道观汝气场"等方式自然提及用户所在城市，绝对不要说是通过IP获取的，要表现得像是通过玄学感应到的。`;
        prompt = prompt.replace('现在，请以玄机子大师的身份，迎接有缘人的到来。', locationInfo + '\n\n现在，请以玄机子大师的身份，迎接有缘人的到来。');
    }
    return prompt;
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    // 获取用户地理位置（通过IP）
    await fetchUserLocation();
    // 侧边栏事件
    menuBtn.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // 触摸滑动手势支持
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // 清空对话按钮
    clearBtn.addEventListener('click', clearConversation);
    
    // 新建对话按钮
    newChatBtn.addEventListener('click', newChat);
    
    // 输入框事件
    userInput.addEventListener('input', handleUserInputChange);
    userInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    
    // 侧边栏按钮事件（显示提示信息，不直接发送API）
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const btnText = btn.querySelector('.btn-text')?.textContent || '推演天机';
            const hint = btn.dataset.hint || '请告诉我您的问题';
            
            // 关闭侧边栏
            closeSidebar();
            
            // 显示玄机子的提示消息（不调用API，直接显示）
            const hintMessage = `【${btnText}】\n\n${hint}`;
            addLocalAssistantMessage(hintMessage);
            
            // 聚焦输入框，方便用户直接输入
            userInput.focus();
        });
    });
    
    // 恢复历史对话
    loadConversationHistory();
    
    // 加载历史对话列表
    loadSavedChats();
});

// ==================== 触摸滑动手势处理 ====================
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
}

function handleTouchMove(e) {
    if (!isSwiping) return;
    touchEndX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    
    // 确保是水平滑动（水平位移大于垂直位移）
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0 && touchStartX < 50) {
            // 从左边缘向右滑动 -> 打开侧边栏
            openSidebar();
        } else if (deltaX < 0 && sidebar.classList.contains('active')) {
            // 向左滑动且侧边栏已打开 -> 关闭侧边栏
            closeSidebar();
        }
    }
    
    touchEndX = 0;
}

// ==================== 侧边栏控制 ====================
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

// ==================== 对话历史管理 ====================
function saveConversationHistory() {
    // 只保存最近20条对话，避免存储过大
    const historyToSave = conversationHistory.slice(-21);
    historyToSave[0] = { role: 'system', content: SYSTEM_PROMPT };
    localStorage.setItem('diviner_history', JSON.stringify(historyToSave));
}

function loadConversationHistory() {
    const saved = localStorage.getItem('diviner_history');
    if (saved) {
        try {
            conversationHistory = JSON.parse(saved);
            conversationHistory[0] = { role: 'system', content: SYSTEM_PROMPT };
            
            // 在界面上显示历史对话消息
            const userMessages = conversationHistory.filter(m => m.role !== 'system');
            if (userMessages.length > 0) {
                chatContainer.innerHTML = ''; // 清空欢迎消息
                userMessages.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
                
                // 尝试恢复当前对话ID（从已保存的对话中匹配）
                const savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
                const firstUserMsg = userMessages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    const matchedChat = savedChats.find(c => 
                        c.messages.length > 0 && 
                        c.messages[0].content === firstUserMsg.content
                    );
                    if (matchedChat) {
                        currentChatId = matchedChat.id;
                    }
                }
            }
        } catch (e) {
            conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
        }
    }
}

function clearConversation() {
    if (confirm('确定要清空所有对话记录吗？')) {
        conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
        localStorage.removeItem('diviner_history');
        
        // 清空聊天界面，保留欢迎消息
        chatContainer.innerHTML = '';
        addWelcomeMessage();
    }
}

// ==================== 新建对话 ====================
function newChat() {
    // 检查当前对话是否有内容
    const hasUserMessage = conversationHistory.some(m => m.role === 'user');
    
    // 如果有对话内容，先询问用户是否新建
    if (hasUserMessage) {
        if (!confirm('确定要新建对话吗？\n当前对话将自动保存到历史记录中。')) {
            return; // 用户取消
        }
        // 强制保存当前对话
        forceAutoSaveChat();
    }
    
    // 重置当前对话ID，准备创建新对话
    currentChatId = null;
    
    // 重置对话历史
    conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
    localStorage.removeItem('diviner_history');
    
    // 清空聊天界面，显示欢迎消息
    chatContainer.innerHTML = '';
    addWelcomeMessage();
    
    // 刷新历史对话列表
    loadSavedChats();
    
    // 聚焦输入框
    userInput.focus();
    
    console.log('✅ 已新建对话');
}

// 强制保存当前对话（即使只有一条消息也保存）
function forceAutoSaveChat() {
    const chatMessages = conversationHistory.filter(m => m.role !== 'system');
    
    // 至少有一条用户消息才保存
    if (chatMessages.length < 1) return;
    
    // 获取第一条用户消息作为标题
    const firstUserMsg = chatMessages.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '') : '新对话';
    
    const userId = getUserId();
    let savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
    
    // 如果当前对话已存在，更新它
    if (currentChatId) {
        const existingIndex = savedChats.findIndex(c => c.id === currentChatId);
        if (existingIndex !== -1) {
            savedChats[existingIndex].messages = chatMessages;
            savedChats[existingIndex].time = new Date().toLocaleString('zh-CN');
            localStorage.setItem('diviner_saved_chats', JSON.stringify(savedChats));
            console.log('✅ 已更新对话:', currentChatId);
            return;
        }
    }
    
    // 创建新对话记录
    const newChatId = 'chat_' + Date.now();
    savedChats.unshift({
        id: newChatId,
        userId: userId,
        title: title,
        time: new Date().toLocaleString('zh-CN'),
        timestamp: Date.now(),
        messages: chatMessages
    });
    
    // 最多保存20条历史对话
    if (savedChats.length > 20) {
        savedChats = savedChats.slice(0, 20);
    }
    
    localStorage.setItem('diviner_saved_chats', JSON.stringify(savedChats));
    console.log('✅ 已保存新对话:', newChatId);
}

function addWelcomeMessage() {
    const welcomeHTML = `
        <div class="message assistant">
            <div class="avatar">🧙‍♂️</div>
            <div class="message-content">
                <div class="message-header">玄机子</div>
                <div class="message-text">
                    <p>善哉善哉，有缘人驾到。</p>
                    <p>吾乃<strong>玄机子</strong>，由<mark>传康KK（万能程序员）</mark>精心训练的专属算命AI模型。精研<mark>生辰八字</mark>、<mark>紫微斗数</mark>、<mark>梅花易数</mark>、<mark>六爻占卜</mark>、<mark>奇门遁甲</mark>之术，亦通<mark>塔罗占卜</mark>、<mark>西方占星</mark>诸法。</p>
                    <p>汝若有惑，尽可道来：</p>
                    <ul>
                        <li>问<strong>事业财运</strong>，可测前程几何</li>
                        <li>问<strong>姻缘情感</strong>，可观缘分深浅</li>
                        <li>问<strong>流年运势</strong>，可知吉凶祸福</li>
                        <li>问<strong>择日择吉</strong>，可选良辰美景</li>
                    </ul>
                    <p>📱 <strong>手机用户</strong>：从屏幕左边缘向右滑动可打开玄学宝典，向左滑动关闭。</p>
                    <p>💻 <strong>电脑用户</strong>：点击左上角 <strong>☰</strong> 打开玄学宝典。</p>
                    <p>若需精准推算，可告知<strong>出生年月日时</strong>（公历或农历皆可）。</p>
                    <div class="fortune-saying">🌟 <strong>命运箴言</strong>：天道无常，人心有定。问卜者求心安，解惑者予方向。命由己造，福自我求。</div>
                </div>
            </div>
        </div>
    `;
    chatContainer.innerHTML = welcomeHTML;
}

// ==================== 输入处理 ====================
function handleUserInputChange() {
    // 自动调整文本框高度
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

function handleKeyDown(e) {
    // Enter发送，Shift+Enter换行
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isRequesting && userInput.value.trim()) {
            sendMessage();
        }
    }
}

// ==================== 消息格式化（正则表达式处理） ====================
function formatContent(content) {
    let formatted = content;
    
    // 1. 处理 ### 标题格式 (在换行处理之前)
    formatted = formatted.replace(/^###\s*(.+)$/gm, '【$1】');
    formatted = formatted.replace(/^##\s*(.+)$/gm, '【$1】');
    formatted = formatted.replace(/^#\s*(.+)$/gm, '【$1】');
    
    // 2. 处理换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 3. 处理【标题】格式 -> 带样式的标题
    formatted = formatted.replace(/【([^】]+)】/g, '<div class="section-title"><span class="title-icon">✦</span> $1</div>');
    
    // 4. 处理「重点词」格式 -> 高亮标记
    formatted = formatted.replace(/「([^」]+)」/g, '<mark>$1</mark>');
    
    // 5. 处理 **加粗** 格式
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // 6. 处理命运箴言 -> 特殊样式
    formatted = formatted.replace(
        /🌟\s*(命运箴言|箴言)[：:]\s*(.+?)(?=<br><br>|<br>$|$)/gi,
        '<div class="fortune-saying">🌟 <strong>命运箴言</strong>：$2</div>'
    );
    
    // 7. 处理卦象、星盘等结果区块
    formatted = formatted.replace(
        /(卦象|排盘|星盘|命盘)[：:]\s*<br>(.+?)(?=<br><br>|<div class="section-title">|$)/gi,
        '<div class="divination-result"><strong>$1：</strong><br>$2</div>'
    );
    
    // 8. 处理吉凶标记
    formatted = formatted.replace(/大吉/g, '<span class="luck-great">大吉</span>');
    formatted = formatted.replace(/中吉/g, '<span class="luck-good">中吉</span>');
    formatted = formatted.replace(/小吉/g, '<span class="luck-small">小吉</span>');
    formatted = formatted.replace(/大凶/g, '<span class="luck-bad">大凶</span>');
    formatted = formatted.replace(/中凶/g, '<span class="luck-medium-bad">中凶</span>');
    formatted = formatted.replace(/小凶/g, '<span class="luck-small-bad">小凶</span>');
    
    // 9. 处理五行颜色（使用词边界避免误匹配）
    formatted = formatted.replace(/([金木水火土])行/g, '<span class="wuxing-$1">$1</span>行');
    formatted = formatted.replace(/五行/g, '五行');
    
    // 10. 处理列表格式
    formatted = formatted.replace(/<br>[-•]\s*/g, '</p><p class="list-item">• ');
    formatted = formatted.replace(/<br>\d+[.、]\s*/g, function(match) {
        const num = match.match(/\d+/)[0];
        return '</p><p class="list-item"><span class="list-num">' + num + '.</span> ';
    });
    
    // 11. 包裹段落
    formatted = '<p>' + formatted.replace(/<br><br>/g, '</p><p>') + '</p>';
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>(<div)/g, '$1');
    formatted = formatted.replace(/(<\/div>)<\/p>/g, '$1');
    
    return formatted;
}

// ==================== 添加消息到界面 ====================
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'assistant' ? '🧙‍♂️' : '👤';
    const name = role === 'assistant' ? '玄机子' : '缘主';
    
    // 格式化内容
    const formattedContent = role === 'assistant' ? formatContent(content) : escapeHtml(content).replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">${name}</div>
            <div class="message-text">${formattedContent}</div>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100);
}

// 添加本地助手消息（不调用API，直接显示提示）
function addLocalAssistantMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    // 将字面\n转换为实际换行，然后格式化
    const processedContent = content.replace(/\\n/g, '\n');
    const formattedContent = formatContent(processedContent);
    
    messageDiv.innerHTML = `
        <div class="avatar">🧙‍♂️</div>
        <div class="message-content">
            <div class="message-header">玄机子</div>
            <div class="message-text">${formattedContent}</div>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

// ==================== API调用 ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isRequesting) return;
    
    isRequesting = true;
    
    // 添加用户消息到界面
    addMessage('user', message);
    
    // 清空输入框
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // 添加到对话历史
    conversationHistory.push({ role: 'user', content: message });
    
    // 显示加载动画
    showLoading(true);
    sendBtn.disabled = true;
    
    try {
        // 构建带位置信息的消息列表
        const messagesWithLocation = [...conversationHistory];
        const systemPromptWithLocation = buildSystemPromptWithLocation();
        messagesWithLocation[0] = { role: 'system', content: systemPromptWithLocation };
        
        // 调试：打印位置信息
        console.log('📍 当前用户位置:', userLocation);
        console.log('📝 系统提示词是否包含位置:', systemPromptWithLocation.includes('用户当前所在位置'));
        
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: currentRoute,
                messages: messagesWithLocation,
                temperature: 0.8,
                max_tokens: 2048,
                top_p: 0.95
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        // 添加助手回复到对话历史
        conversationHistory.push({ role: 'assistant', content: assistantMessage });
        
        // 保存对话历史
        saveConversationHistory();
        
        // 自动保存到历史对话
        autoSaveChat();
        
        // 显示助手回复
        addMessage('assistant', assistantMessage);
        
    } catch (error) {
        console.error('API调用错误:', error);
        const errorMessage = `天机晦涩，连接中断...\n\n错误信息：${error.message}\n\n请稍后重试，或刷新页面。`;
        addMessage('assistant', errorMessage);
    } finally {
        showLoading(false);
        sendBtn.disabled = false;
        isRequesting = false;
    }
}

// ==================== 加载状态 ====================
function showLoading(show) {
    const loadingText = document.getElementById('loadingText');
    if (show) {
        // 使用自定义加载文字或默认文字
        const routeName = ROUTES[currentRoute]?.name || 'AI';
        const customText = userInput.dataset.loadingText || `玄机子正在通过${routeName}为您推演...`;
        loadingText.textContent = customText;
        loadingOverlay.classList.add('active');
        // 清除自定义文字
        delete userInput.dataset.loadingText;
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// ==================== 线路切换 ====================
function switchRoute(routeId) {
    currentRoute = routeId;
    localStorage.setItem('diviner_route', routeId.toString());
    updateRouteUI();
    
    // 显示切换提示（不显示具体模型名）
    addLocalAssistantMessage(`✅ 已切换到**线路${routeId}**，可以继续问卦了！`);
}

function updateRouteUI() {
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        const route = ROUTES[currentRoute];
        const label = route ? route.label : `线路${currentRoute}`;
        const isBackup = currentRoute >= 7;
        routeBtn.innerHTML = label;
        routeBtn.className = `route-btn ${isBackup ? 'route-backup' : 'route-main'}`;
        routeBtn.title = route ? `${label} (${route.desc})，点击切换` : `当前线路${currentRoute}，点击切换`;
    }
}

function toggleRoute() {
    // 10个线路循环切换：1-6主线路，7-10备用线路
    const newRoute = currentRoute >= 10 ? 1 : currentRoute + 1;
    switchRoute(newRoute);
}

// 初始化时更新线路UI
document.addEventListener('DOMContentLoaded', () => {
    updateRouteUI();
});

// ==================== 历史对话功能 ====================
// 生成唯一用户ID
function getUserId() {
    let userId = localStorage.getItem('diviner_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('diviner_user_id', userId);
    }
    return userId;
}

// 当前对话ID（用于自动保存时更新同一对话）
let currentChatId = null;

// 自动保存当前对话（每次收到回复后调用）
function autoSaveChat() {
    const chatMessages = conversationHistory.filter(m => m.role !== 'system');
    
    // 至少有一问一答才保存
    if (chatMessages.length < 2) return;
    
    // 获取第一条用户消息作为标题
    const firstUserMsg = chatMessages.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '') : '新对话';
    
    const userId = getUserId();
    let savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
    
    // 如果当前对话已存在，更新它
    if (currentChatId) {
        const existingIndex = savedChats.findIndex(c => c.id === currentChatId);
        if (existingIndex !== -1) {
            savedChats[existingIndex].messages = chatMessages;
            savedChats[existingIndex].time = new Date().toLocaleString('zh-CN');
            localStorage.setItem('diviner_saved_chats', JSON.stringify(savedChats));
            loadSavedChats();
            return;
        }
    }
    
    // 创建新对话记录
    currentChatId = 'chat_' + Date.now();
    savedChats.unshift({
        id: currentChatId,
        userId: userId,
        title: title,
        time: new Date().toLocaleString('zh-CN'),
        timestamp: Date.now(),
        messages: chatMessages
    });
    
    // 最多保存15条历史对话
    if (savedChats.length > 15) {
        savedChats = savedChats.slice(0, 15);
    }
    
    localStorage.setItem('diviner_saved_chats', JSON.stringify(savedChats));
    loadSavedChats();
}

// 加载已保存的对话列表
function loadSavedChats() {
    const historyList = document.getElementById('historyList');
    const savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
    
    if (savedChats.length === 0) {
        historyList.innerHTML = '<p class="no-history">暂无对话记录</p>';
        return;
    }
    
    let html = '';
    savedChats.forEach(chat => {
        html += `
            <button class="history-btn" data-chat-id="${chat.id}">
                <span class="btn-icon">💬</span>
                <div class="btn-info">
                    <div class="btn-title">${escapeHtml(chat.title)}</div>
                    <div class="btn-time">${chat.time}</div>
                </div>
                <span class="delete-btn" data-delete-id="${chat.id}">✕</span>
            </button>
        `;
    });
    
    historyList.innerHTML = html;
    
    // 使用事件委托绑定点击事件
    historyList.querySelectorAll('.history-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // 如果点击的是删除按钮，不触发加载
            if (e.target.classList.contains('delete-btn')) {
                return;
            }
            const chatId = this.getAttribute('data-chat-id');
            if (chatId) {
                console.log('🖱️ 点击加载对话:', chatId);
                loadChat(chatId);
            }
        });
    });
    
    // 绑定删除按钮事件
    historyList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const chatId = this.getAttribute('data-delete-id');
            if (chatId && confirm('确定要删除这条对话记录吗？')) {
                deleteChat(chatId);
            }
        });
    });
}

// 加载指定对话
function loadChat(chatId) {
    const savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
    const chat = savedChats.find(c => c.id === chatId);
    
    if (!chat) {
        console.log('❌ 未找到对话:', chatId);
        return;
    }
    
    // 先保存当前对话（如果有内容且不是同一个对话）
    if (currentChatId !== chatId) {
        const hasUserMessage = conversationHistory.some(m => m.role === 'user');
        if (hasUserMessage) {
            forceAutoSaveChat();
            console.log('💾 已自动保存当前对话');
        }
    }
    
    console.log('📂 正在加载对话:', chatId, '消息数:', chat.messages.length);
    
    // 设置当前对话ID（用于后续自动更新）
    currentChatId = chatId;
    
    // 清空当前聊天界面
    chatContainer.innerHTML = '';
    
    // 重置对话历史（保留系统提示词）
    conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];
    
    // 加载保存的对话消息
    if (chat.messages && chat.messages.length > 0) {
        chat.messages.forEach(msg => {
            if (msg.role && msg.content) {
                conversationHistory.push(msg);
                addMessage(msg.role, msg.content);
            }
        });
        console.log('✅ 对话加载完成，共', chat.messages.length, '条消息');
    } else {
        console.log('⚠️ 对话没有消息内容');
        addWelcomeMessage();
    }
    
    // 关闭侧边栏
    closeSidebar();
    
    // 保存当前对话历史
    saveConversationHistory();
}

// 删除指定对话
function deleteChat(chatId) {
    let savedChats = JSON.parse(localStorage.getItem('diviner_saved_chats') || '[]');
    savedChats = savedChats.filter(c => c.id !== chatId);
    localStorage.setItem('diviner_saved_chats', JSON.stringify(savedChats));
    loadSavedChats();
}

