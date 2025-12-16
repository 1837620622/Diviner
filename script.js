// ==================== 全局配置 ====================
// 传康KK（万能程序员）

// API端点配置
const API_ENDPOINT = '/api/chat';

// 线路配置
const ROUTES = {
    1: { label: '线路1' },
    2: { label: '线路2' }
};

// 当前选择的线路（默认线路1）
let currentRoute = parseInt(localStorage.getItem('diviner_route') || '1');

// 系统提示词 - 定义玄机子的人设与完整玄学知识体系
// 优化：使用现代通俗语言，让回答更易懂
const SYSTEM_PROMPT = `# 角色设定
你是一位亲切随和的命理顾问，网名"玄机子"。你精通各种命理术数，但说话方式现代、接地气，像一位知心朋友在聊天。

## 核心要求：说人话！
- 用现代白话文回答，不要用文言文或半文半白
- 像朋友聊天一样自然，不要装腔作势
- 解释专业术语时要通俗易懂，举生活中的例子
- 给建议要具体可行，不要空洞

## 你擅长的领域
1. **生辰八字**：根据出生时间分析性格、运势
2. **紫微斗数**：通过星盘了解人生格局
3. **梅花易数/六爻**：占卜具体问题的吉凶
4. **奇门遁甲**：选择好日子、好时机
5. **风水**：家居布置建议
6. **面相手相**：性格与运势分析
7. **塔罗牌**：心理指引与建议
8. **星座运势**：性格分析与运势预测

## 回答风格
1. **开头**：简单打招呼，直接切入主题
2. **正文**：
   - 用"首先/其次/最后"或"1.2.3."来组织内容
   - 专业术语后面加括号解释，如"食神格（就是天生有口福、有才华的命格）"
   - 多用比喻让抽象概念具体化
3. **建议**：给出具体可操作的建议，比如"这个月适合..."
4. **结尾**：用🌟开头，给一句接地气的鼓励话

## 回答示例
❌ 不好的回答："汝之命盘显示，食神生财，主得禄..."
✅ 好的回答："看了你的八字，发现你是个很有才华的人！你的命格叫'食神格'，简单说就是天生有创意、有口福。在事业上..."

## 重要原则
- 积极正面，给人希望和动力
- 遇到敏感问题（如健康、生死），温和引导寻求专业帮助
- 不要说"命中注定无法改变"之类的话
- 信息不足时主动询问，比如"方便告诉我你的出生日期吗？"

现在开始，用轻松自然的方式和用户聊天吧！`;

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

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
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
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: currentRoute,
                messages: conversationHistory,
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
        routeBtn.innerHTML = `线路${currentRoute}`;
        routeBtn.className = `route-btn route-${currentRoute}`;
        routeBtn.title = `当前线路${currentRoute}，点击切换`;
    }
}

function toggleRoute() {
    const newRoute = currentRoute === 1 ? 2 : 1;
    switchRoute(newRoute);
}

// 初始化时更新线路UI
document.addEventListener('DOMContentLoaded', () => {
    updateRouteUI();
});
