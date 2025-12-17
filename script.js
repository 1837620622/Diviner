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
    3: { label: '线路3', desc: 'DeepSeek-R1' },
    4: { label: '线路4', desc: 'Qwen3-235B' }
};

// 备用线路配置（iFlow）
const BACKUP_ROUTES = {
    5: { label: '备用1', desc: 'DeepSeek-V3' },
    6: { label: '备用2', desc: 'Qwen3-235B' },
    7: { label: '备用3', desc: 'DeepSeek-R1' },
    8: { label: '备用4', desc: 'Qwen3-235B' }
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

1. **通俗易懂为主**，不要使用过于深奥的古文，用现代人能听懂的话解释
2. 专业术语必须**立即解释**，例如："日主乙木（如藤蔓花草）"、"偏印格（聪慧善思型）"
3. 可以适当用比喻让命理概念更形象，如"水多木浮"可解释为"支持太多反而让你飘忽不定"
4. 给出**具体可操作的建议**，如方位、颜色、适合交往的属相等
5. 语气亲切自然，像一位智慧的长辈在聊天，不要太装神弄鬼
6. 积极正向，强调如何趋吉避凶，给人希望和方向

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
                    <p>👋 嗨，欢迎来找我聊聊！</p>
                    <p>我是<strong>玄机子</strong>，一个懂命理的AI助手，由<mark>传康KK（万能程序员）</mark>打造。我会用通俗易懂的方式帮你分析运势，不整那些玄乎的话！</p>
                    <p>我能帮你看：</p>
                    <ul>
                        <li>💼 <strong>事业财运</strong> - 工作发展、投资理财</li>
                        <li>💕 <strong>感情姻缘</strong> - 桃花运、合不合适</li>
                        <li>📅 <strong>运势分析</strong> - 今年运气怎么样</li>
                        <li>🎯 <strong>择日选吉</strong> - 选个好日子办事</li>
                    </ul>
                    <div class="route-tip">
                        <p>❕ <strong>【多线路体验】</strong>：点击右上角 <mark>线路按钮</mark> 可切换不同AI模型！</p>
                        <p>❕ <strong>每条线路回答风格不同</strong>，同一问题换个线路可能有惊喜哦～</p>
                        <p>⚡ 如果某条线路繁忙，切换到其他线路试试！</p>
                    </div>
                    <p>📱 <strong>手机用户</strong>：左滑打开功能菜单</p>
                    <p>想算得准一点的话，告诉我你的<strong>出生年月日时</strong>就行（公历农历都可以）～</p>
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
// 根据当前线路应用不同的格式化策略
function formatContent(content) {
    const routeId = currentRoute || 1;
    return formatContentByRoute(content, routeId);
}

// 分线路格式化函数
function formatContentByRoute(content, routeId) {
    let formatted = content;
    
    // 根据线路ID应用不同的预处理策略
    switch(routeId) {
        case 1: // DeepSeek-V3 - 主要问题：✦符号分离
        case 5: // 备用1 (DeepSeek备用)
            formatted = preprocessDeepSeekFormat(formatted);
            break;
        case 2: // Qwen3-80B - 格式较清晰
            formatted = preprocessQwenFormat(formatted);
            break;
        case 3: // DeepSeek-R1 - 格式较好
        case 7: // 备用3 (DeepSeek-R1备用)
            formatted = preprocessR1Format(formatted);
            break;
        case 4: // Qwen3-235B - 特殊符号
        case 6: // 备用2
        case 8: // 备用4
            formatted = preprocessQwen235Format(formatted);
            break;
        default:
            formatted = preprocessGenericFormat(formatted);
    }
    
    // 应用通用格式化处理
    return applyCommonFormatting(formatted);
}

// DeepSeek系列（线路1, 备用1）预处理 - 主要解决✦符号分离问题
function preprocessDeepSeekFormat(content) {
    let formatted = content;
    
    // 1. 重点修复✦符号和标题的各种分离情况（增强版）
    formatted = formatted.replace(/✦\s*\n+\s*【/g, '✦【'); // ✦换行【 -> ✦【
    formatted = formatted.replace(/✦\s*\n+\s*【/g, '【'); // ✦换行【 -> 【（移除✦）
    formatted = formatted.replace(/✦\s+【/g, '【'); // ✦ 【 -> 【
    formatted = formatted.replace(/^\s*✦\s*$/gm, ''); // 单独一行的✦符号删除
    // 修复iOS/Android兼容性问题：替换负向后行断言为兼容的写法
    formatted = formatted.replace(/【([^】]*)】\s*✦/g, '【$1】'); // 标题后的✦符号
    formatted = formatted.replace(/✦\s*(?!\n*【)/g, ''); // 不在标题前的✦符号（简化版）
    
    // 2. 修复标题内换行（DeepSeek容易出现这种问题）- 增强版
    formatted = formatted.replace(/【([^】\n]*)\n+([^】\n]*)】/g, '【$1$2】');
    formatted = formatted.replace(/【([^】\n]*)\n+】/g, '【$1】');
    formatted = formatted.replace(/【\n+([^】]+)】/g, '【$1】');
    
    // 2.1 特殊处理：标题结尾的换行
    formatted = formatted.replace(/【([^】]+)\n+】/g, '【$1】');
    formatted = formatted.replace(/【([^】]+)\s+】/g, '【$1】');
    
    // 3. 循环清理复杂的标题内换行（增加迭代次数）
    let prevFormatted, iterations = 0;
    do {
        prevFormatted = formatted;
        formatted = formatted.replace(/【([^】]*)\n+([^】]*)】/g, '【$1 $2】');
        iterations++;
    } while (formatted !== prevFormatted && iterations < 8);
    
    // 4. 处理特殊分割线格式（• --）
    formatted = formatted.replace(/•\s*--\s*\n+/g, '');
    formatted = formatted.replace(/\n+•\s*--\s*/g, '\n\n<hr class="divider">\n\n');
    
    // 5. 清理多余的空行和空格
    formatted = formatted.replace(/\n{3,}/g, '\n\n'); // 多个连续换行压缩为2个
    formatted = formatted.replace(/^\s+|\s+$/gm, ''); // 行首行尾空格
    
    return formatted;
}

// Qwen3-80B（线路2）预处理 - 格式较清晰，轻度优化
function preprocessQwenFormat(content) {
    let formatted = content;
    
    // 轻度处理，主要清理多余装饰符号
    formatted = formatted.replace(/^\s*[✦🔹◆•]\s*【/gm, '【');
    formatted = formatted.replace(/【([^】]+)】/g, function(match, p1) {
        return '【' + p1.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '】';
    });
    
    return formatted;
}

// DeepSeek-R1（线路3, 备用3）预处理 - 格式较好，最小优化
function preprocessR1Format(content) {
    let formatted = content;
    
    // 最小处理，主要统一标题格式
    formatted = formatted.replace(/^\s*(✦|🔹)\s*【/gm, '【');
    
    return formatted;
}

// Qwen3-235B系列（线路4, 备用2, 备用4）预处理 - 处理特殊符号
function preprocessQwen235Format(content) {
    let formatted = content;
    
    // 1. 处理🔹符号和标题
    formatted = formatted.replace(/🔹\s*\n+\s*【/g, '🔹【');
    formatted = formatted.replace(/🔹\s+【/g, '🔹【');
    formatted = formatted.replace(/^\s*🔹\s*$/gm, ''); // 单独的🔹符号
    
    // 2. 处理数字符号（1️⃣2️⃣3️⃣）
    formatted = formatted.replace(/([1-9]️⃣)\s*\n+/g, '$1 ');
    formatted = formatted.replace(/([1-9]️⃣)\s+(.)/g, '$1 $2');
    
    // 3. 处理嵌套的mark结构
    formatted = formatted.replace(/【([^】]*)\n+([^】]*)】/g, '【$1 $2】');
    
    // 4. 统一🔹为✦（保持一致的图标）
    formatted = formatted.replace(/🔹【/g, '【');
    
    return formatted;
}

// 通用格式预处理（默认）
function preprocessGenericFormat(content) {
    let formatted = content;
    
    // 通用处理逻辑
    formatted = formatted.replace(/^\s*[✦🔹◆•]\s*【/gm, '【');
    formatted = formatted.replace(/(\n|^)\s*[✦🔹◆•]\s*【/g, '$1【');
    formatted = formatted.replace(/【([^】]*)\n+([^】]*)】/g, '【$1 $2】');
    
    return formatted;
}

// 通用格式化处理（应用于所有线路）
function applyCommonFormatting(content) {
    let formatted = content;
    
    // 处理特殊分割线
    formatted = formatted.replace(/\n+[•·]\s*--+\n+/g, '\n\n<hr class="divider">\n\n');
    formatted = formatted.replace(/\n+--+\n+/g, '\n\n<hr class="divider">\n\n');
    formatted = formatted.replace(/\n+━+\n+/g, '\n\n<hr class="divider">\n\n');
    
    // 处理Markdown标题格式
    formatted = formatted.replace(/^###\s*(.+)$/gm, '【$1】');
    formatted = formatted.replace(/^##\s*(.+)$/gm, '【$1】');
    formatted = formatted.replace(/^#\s*(.+)$/gm, '【$1】');
    
    // 处理其他常见的标题格式
    formatted = formatted.replace(/^(\d+[.、])\s*【/gm, '【'); // 序号+标题
    formatted = formatted.replace(/^[✦🔹◆•]\s*(.+)$/gm, '【$1】'); // 符号开头的标题
    
    // 处理数字符号标题（针对Qwen3-235B）
    formatted = formatted.replace(/([1-9]️⃣)\s*([^\n]+)/g, '【$2】');
    
    // 2. 处理换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 处理【标题】格式 -> 带样式的标题（增强版清理）
    formatted = formatted.replace(/【([^】]+)】/g, function(match, p1) {
        let cleanTitle = p1.replace(/<br>/g, ' ') // 清理<br>标签
                          .replace(/\s+/g, ' ') // 压缩多个空格
                          .replace(/^[✦🔹◆•⭐🌟🎯💫\s]+/, '') // 清理开头的装饰符号（扩展）
                          .replace(/[✦🔹◆•⭐🌟🎯💫\s]+$/, '') // 清理结尾的装饰符号（扩展）
                          .replace(/^(第[一二三四五六七八九十\d]+[重关步])[：:]/g, '$1：') // 规范化序号格式
                          .trim();
        // 根据内容选择合适的图标
        const icon = getIconByContent(cleanTitle);
        return '<div class="section-title"><span class="title-icon">' + icon + '</span> ' + cleanTitle + '</div>';
    });
    
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
    
    // 处理列表格式（全面增强版）
    // 处理无序列表的各种符号
    formatted = formatted.replace(/<br>\s*[-•·→▪◆]\s*/g, '</p><p class="list-item">• ');
    formatted = formatted.replace(/<br>\s*🔹\s*/g, '</p><p class="list-item">🔹 ');
    
    // 处理有序列表的各种格式
    formatted = formatted.replace(/<br>\s*(\d+)[.、)]\s*/g, function(match, num) {
        return '</p><p class="list-item"><span class="list-num">' + num + '.</span> ';
    });
    
    // 处理数字符号列表（针对Qwen3-235B）
    formatted = formatted.replace(/<br>\s*([1-9]️⃣)\s*/g, function(match, emoji) {
        const num = emoji.replace('️⃣', '');
        return '</p><p class="list-item"><span class="list-num">' + num + '️⃣</span> ';
    });
    
    // 处理特殊项目符号
    formatted = formatted.replace(/<br>\s*(\([^)]+\))\s*/g, '</p><p class="list-item">$1 ');
    
    // 11. 包裹段落（增强版）
    // 11.1 先清理多余的换行
    formatted = formatted.replace(/<br>\s*<br>\s*<br>/g, '<br><br>'); // 三个以上连续<br>压缩为两个
    
    // 11.2 包裹段落
    formatted = '<p>' + formatted.replace(/<br><br>/g, '</p><p>') + '</p>';
    
    // 11.3 清理空段落和修复结构
    formatted = formatted.replace(/<p>\s*<\/p>/g, ''); // 清理空段落
    formatted = formatted.replace(/<p>\s*(<div[^>]*>)/g, '$1'); // div前的p标签
    formatted = formatted.replace(/(<\/div>)\s*<\/p>/g, '$1'); // div后的p标签
    formatted = formatted.replace(/<p>\s*(<hr[^>]*>)/g, '$1'); // hr前的p标签
    formatted = formatted.replace(/(divider">)\s*<\/p>/g, '$1'); // hr后的p标签
    formatted = formatted.replace(/<p>\s*(<generic[^>]*>)/g, '$1'); // generic前的p标签
    
    return formatted;
}

// 根据标题内容选择合适的图标
function getIconByContent(title) {
    if (title.includes('八字') || title.includes('命局') || title.includes('排盘')) return '🎯';
    if (title.includes('感情') || title.includes('情路') || title.includes('姻缘')) return '💕';
    if (title.includes('运势') || title.includes('大运') || title.includes('流年')) return '⭐';
    if (title.includes('箴言') || title.includes('赠言') || title.includes('启示')) return '🌟';
    if (title.includes('破局') || title.includes('要诀') || title.includes('方法')) return '🔑';
    if (title.includes('重') || title.includes('关') || title.includes('步')) return '🔹';
    return '✦'; // 默认图标
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
        
        // 检查响应数据是否有效
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('异常响应数据:', data);
            throw new Error(data.error || '服务器返回了异常数据，请切换线路重试');
        }
        
        const assistantMessage = data.choices[0].message.content;
        
        // 添加助手回复到对话历史
        conversationHistory.push({ role: 'assistant', content: assistantMessage });
        
        // 保存对话历史
        saveConversationHistory();
        
        // 自动保存到历史对话
        autoSaveChat();
        
        // 显示助手回复
        addMessage('assistant', assistantMessage);
        
        // 触发赞赏码弹窗（30%概率）
        if (Math.random() < 0.3) {
            setTimeout(() => {
                showDonationModal();
            }, 3000); // 延迟3秒，给用户时间阅读回答
        }
        
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
    
    // 显示切换提示（使用友好的线路名称）
    const route = ROUTES[routeId];
    const label = route ? route.label : `线路${routeId}`;
    addLocalAssistantMessage(`✅ 已切换到**${label}**，可以继续问卦了！`);
}

function updateRouteUI() {
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        const route = ROUTES[currentRoute];
        const label = route ? route.label : `线路${currentRoute}`;
        const isBackup = currentRoute >= 5;
        routeBtn.innerHTML = label;
        routeBtn.className = `route-btn ${isBackup ? 'route-backup' : 'route-main'}`;
        routeBtn.title = route ? `${label} (${route.desc})，点击切换线路体验不同风格` : `当前线路${currentRoute}，点击切换`;
    }
}

function toggleRoute() {
    // 线路切换顺序：线路1->备用1->线路2->备用2->线路3->备用3->线路4->备用4
    // 对应关系：1->5, 5->2, 2->6, 6->3, 3->7, 7->4, 4->8, 8->1
    const routeOrder = [1, 5, 2, 6, 3, 7, 4, 8];
    const currentIndex = routeOrder.indexOf(currentRoute);
    const nextIndex = (currentIndex + 1) % routeOrder.length;
    const newRoute = routeOrder[nextIndex];
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

// ==================== 修复通知弹窗功能 ====================
// 显示修复通知弹窗
function showUpdateNotification() {
    const notification = document.getElementById('updateNotification');
    if (notification) {
        notification.classList.add('show');
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
    }
}

// 关闭修复通知弹窗
function closeUpdateNotification() {
    const notification = document.getElementById('updateNotification');
    if (notification) {
        notification.classList.remove('show');
        // 恢复页面滚动
        document.body.style.overflow = '';
        // 不再标记已显示过，确保每次刷新都会弹出
    }
}

// 检查是否需要显示更新通知
function checkUpdateNotification() {
    // 每次页面加载都显示通知
    // 延迟1秒显示，让页面先加载完成
    setTimeout(() => {
        showUpdateNotification();
    }, 1000);
}

// 绑定弹窗关闭事件
document.addEventListener('DOMContentLoaded', function() {
    // 关闭按钮点击事件
    const closeBtn = document.getElementById('notificationClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeUpdateNotification);
    }
    
    // 点击背景关闭弹窗
    const notification = document.getElementById('updateNotification');
    if (notification) {
        notification.addEventListener('click', function(e) {
            if (e.target === notification) {
                closeUpdateNotification();
            }
        });
    }
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeUpdateNotification();
        }
    });
    
    // 检查是否需要显示更新通知
    checkUpdateNotification();
});

// ==================== 赞赏码弹窗功能 ====================

// 获取DOM元素
const donationBtn = document.getElementById('donationBtn');
const donationModal = document.getElementById('donationModal');
const donationClose = document.getElementById('donationClose');

// 显示赞赏码弹窗
function showDonationModal() {
    if (donationModal) {
        donationModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        
        // 添加显示动画类
        setTimeout(() => {
            const content = donationModal.querySelector('.donation-content');
            if (content) {
                content.style.animation = 'donationSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }
        }, 10);
    }
}

// 关闭赞赏码弹窗
function closeDonationModal() {
    if (donationModal) {
        const content = donationModal.querySelector('.donation-content');
        if (content) {
            content.style.animation = 'donationSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) reverse';
        }
        
        setTimeout(() => {
            donationModal.classList.remove('show');
            document.body.style.overflow = ''; // 恢复滚动
        }, 300);
    }
}

// 绑定赞赏按钮点击事件
if (donationBtn) {
    donationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showDonationModal();
        
        // 添加按钮点击动画反馈
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 200);
    });
}

// 绑定关闭按钮点击事件
if (donationClose) {
    donationClose.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeDonationModal();
    });
}

// 点击背景关闭弹窗
if (donationModal) {
    donationModal.addEventListener('click', function(e) {
        if (e.target === donationModal) {
            closeDonationModal();
        }
    });
}

// ESC键关闭弹窗
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && donationModal && donationModal.classList.contains('show')) {
        closeDonationModal();
    }
});

// 在问答结束后自动弹出赞赏码
function showDonationAfterResponse() {
    // 延迟3秒后自动弹出，给用户时间阅读回答
    setTimeout(() => {
        showDonationModal();
    }, 3000);
}

// 修改原有的sendMessage函数，在收到回复后自动弹出赞赏码
const originalSendMessage = window.sendMessage;
if (typeof originalSendMessage === 'function') {
    window.sendMessage = async function(message) {
        const result = await originalSendMessage.call(this, message);
        
        // 检查是否收到了完整的AI回复
        if (result && !result.isLoading) {
            // 随机决定是否弹出赞赏码（50%概率，避免过于频繁）
            if (Math.random() < 0.5) {
                showDonationAfterResponse();
            }
        }
        
        return result;
    };
}

// 监听消息完成事件（用于自动弹出赞赏码）
document.addEventListener('messageComplete', function(e) {
    // 检查是否是真实的用户问题（不是系统消息）
    const isUserQuestion = e.detail && e.detail.isUserMessage;
    
    if (isUserQuestion) {
        // 30%概率弹出赞赏码，降低频率
        if (Math.random() < 0.3) {
            showDonationAfterResponse();
        }
    }
});

// 添加触摸优化（移动端）
if (donationBtn) {
    donationBtn.addEventListener('touchstart', function(e) {
        this.style.transform = 'scale(0.95)';
    }, { passive: true });
    
    donationBtn.addEventListener('touchend', function(e) {
        setTimeout(() => {
            this.style.transform = '';
        }, 200);
    }, { passive: true });
}

// 防止赞赏码图片拖拽
const qrCode = document.querySelector('.qr-code');
if (qrCode) {
    qrCode.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });
    
    // 添加长按保存提示（移动端）
    let pressTimer;
    qrCode.addEventListener('touchstart', function(e) {
        pressTimer = setTimeout(() => {
            // 可以在这里添加长按保存图片的功能
            console.log('长按赞赏码，可以保存图片');
        }, 800);
    }, { passive: true });
    
    qrCode.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
    }, { passive: true });
}

