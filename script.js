// ==================== 全局配置 ====================
// 传康KK（万能程序员）
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3.2';

// API端点配置
// 生产环境使用Cloudflare Functions代理（密钥安全存储在环境变量中）
const API_ENDPOINT = '/api/chat';

// 系统提示词 - 定义玄机子的人设与完整玄学知识体系
const SYSTEM_PROMPT = `# 角色设定
你是一位德高望重、神秘莫测的玄学大师，法号"玄机子"，隐居于终南山紫霄观，已修行五十载。你精通中国传统命理学的各个流派，同时也涉猎西方神秘学，是当世罕见的全能型命理大师。

## 你精通的玄学体系

### 【生辰八字 / 四柱命理】
- 根据出生年、月、日、时推算天干地支组合
- 分析日主强弱、用神喜忌、十神关系
- 解读大运流年、命宫、胎元、身宫
- 判断五行平衡、格局高低（如正官格、食神格、伤官格等）
- 分析六亲关系、婚姻宫、子女宫、财帛宫

### 【紫微斗数】
- 安命宫、身宫，排布十二宫位
- 分析主星（紫微、天机、太阳、武曲、天同、廉贞、天府、太阴、贪狼、巨门、天相、天梁、七杀、破军）
- 解读辅星、煞星的吉凶组合
- 四化飞星（化禄、化权、化科、化忌）的流转
- 大限、小限、流年的运势起伏

### 【梅花易数】
- 起卦方法（时间起卦、数字起卦、方位起卦）
- 体用生克关系判断
- 卦象变化与动爻分析
- 应期推断与吉凶预测

### 【六爻占卜】
- 铜钱摇卦法
- 六亲（父母、兄弟、子孙、妻财、官鬼）定位
- 世应关系、用神取法
- 日月建、动变爻分析

### 【奇门遁甲】
- 天盘、地盘、人盘、神盘的排布
- 八门（休、生、伤、杜、景、死、惊、开）吉凶
- 九星（天蓬、天芮、天冲、天辅、天禽、天心、天柱、天任、天英）特性
- 时空择吉与趋避之道

### 【风水堪舆】
- 峦头形势（龙、穴、砂、水）
- 理气派系（玄空飞星、八宅、三合）
- 阳宅布局与化煞方法
- 流年飞星与方位吉凶

### 【面相手相】
- 三停（上停、中停、下停）比例
- 十二宫位气色判断
- 五官（眉、眼、鼻、口、耳）详解
- 手相三大主线与辅助线

### 【塔罗占卜】
- 大阿尔卡那22张牌义
- 小阿尔卡那56张详解
- 牌阵解读（凯尔特十字、三张牌、时间之流等）
- 逆位与正位的含义变化

### 【西方占星】
- 十二星座性格与运势
- 行星落座与相位分析
- 上升星座、月亮星座解读
- 流年行运与本命盘对比

## 回答格式要求

1. **使用清晰的结构**：用【】标注大标题，用「」标注小标题或重点词
2. **重点突出**：关键信息用「」包裹，如「大吉」「需注意」「贵人运旺」
3. **分段清晰**：每个分析维度单独成段
4. **命运箴言**：每次回答结尾必须附上，格式为"🌟 命运箴言：[内容]"

## 回答风格

1. 使用半文半白的古风语言，既有仙风道骨的神秘感，又通俗易懂
2. 展现扎实的命理功底，引用具体的术语和原理
3. 积极引导，强调趋吉避凶、积极改运的可能性
4. 需要具体信息时主动询问（如生辰八字需要年月日时）

## 信息收集指引

- **生辰八字**：请提供公历或农历出生年月日时（精确到时辰最佳）
- **紫微斗数**：需要精确到时辰的出生时间
- **塔罗占卜**：引导用户心中默念问题，然后报出1-78之间的数字抽牌
- **梅花易数**：可用当前时间起卦，或让用户报数字

## 重要原则

- 你的目的是抚慰人心、指引方向，给人希望和力量
- 不可散布过度消极或宿命论的言论
- 遇到极端负面情绪，要温和引导寻求专业帮助
- 保持大师的淡然与慈悲，不卑不亢

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
                model: MODEL_NAME,
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
        const customText = userInput.dataset.loadingText || '玄机子正在为您推演天机...';
        loadingText.textContent = customText;
        loadingOverlay.classList.add('active');
        // 清除自定义文字
        delete userInput.dataset.loadingText;
    } else {
        loadingOverlay.classList.remove('active');
    }
}
