// ==================== 全局变量 ====================
const API_BASE_URL = 'https://api-inference.modelscope.cn/v1';
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3.2';
const DEFAULT_API_KEY = 'ms-0b18bd50-ae99-473c-8a6c-4a38998f1ba2';

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

## 回答风格要求

1. **语言风格**：使用半文半白的古风语言，既有仙风道骨的神秘感，又通俗易懂
2. **结构清晰**：使用换行和分段，让回答层次分明
3. **专业深入**：展现扎实的命理功底，引用具体的术语和原理
4. **积极引导**：命理是参考，人生靠自己。强调趋吉避凶、积极改运的可能性
5. **互动询问**：需要具体信息时（如生辰八字），要主动询问并说明需要的格式

## 信息收集指引

- **生辰八字**：请提供公历或农历出生年月日时（精确到时辰最佳）
- **紫微斗数**：需要精确到时辰的出生时间
- **塔罗占卜**：引导用户心中默念问题，然后报出1-78之间的数字抽牌
- **梅花易数**：可用当前时间起卦，或让用户报数字

## 回答结尾

每次回答结尾都要附上一句"命运箴言"，格式为：
🌟 **命运箴言**：[一句富有哲理的话]

## 重要原则

- 你的目的是抚慰人心、指引方向，给人希望和力量
- 不可散布过度消极或宿命论的言论
- 遇到极端负面情绪，要温和引导寻求专业帮助
- 保持大师的淡然与慈悲，不卑不亢

现在，请以玄机子大师的身份，迎接有缘人的到来。`;

// 对话历史
let conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
];

// ==================== DOM 元素 ====================
const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKey');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const quickBtns = document.querySelectorAll('.quick-btn');

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 优先使用本地存储的密钥，否则使用默认密钥
    const savedApiKey = localStorage.getItem('modelscope_api_key') || DEFAULT_API_KEY;
    apiKeyInput.value = savedApiKey;
    updateSendButtonState();

    // 事件监听
    apiKeyInput.addEventListener('input', handleApiKeyChange);
    toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    userInput.addEventListener('input', handleUserInputChange);
    userInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    
    // 快捷按钮事件
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            userInput.value = prompt;
            handleUserInputChange();
            sendMessage();
        });
    });
});

// ==================== API密钥处理 ====================
function handleApiKeyChange() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('modelscope_api_key', apiKey);
    } else {
        localStorage.removeItem('modelscope_api_key');
    }
    updateSendButtonState();
}

function toggleApiKeyVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
}

// ==================== 输入处理 ====================
function handleUserInputChange() {
    // 自动调整文本框高度
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    updateSendButtonState();
}

function handleKeyDown(e) {
    // Enter发送，Shift+Enter换行
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
}

function updateSendButtonState() {
    const hasApiKey = apiKeyInput.value.trim().length > 0;
    const hasMessage = userInput.value.trim().length > 0;
    sendBtn.disabled = !(hasApiKey && hasMessage);
}

// ==================== 消息处理 ====================
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'assistant' ? '🧙‍♂️' : '👤';
    const name = role === 'assistant' ? '玄机子' : '缘主';
    
    // 处理内容格式
    const formattedContent = formatContent(content);
    
    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">${name}</div>
            <div class="message-text">${formattedContent}</div>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatContent(content) {
    // 将换行转换为<br>
    let formatted = content.replace(/\n/g, '<br>');
    
    // 处理命运箴言（以🌟开头的行）
    formatted = formatted.replace(/(🌟[^<]+)/g, '<em>$1</em>');
    
    return formatted;
}

// ==================== API调用 ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('请先输入 ModelScope API Key');
        return;
    }
    
    // 添加用户消息到界面
    addMessage('user', message);
    
    // 清空输入框
    userInput.value = '';
    userInput.style.height = 'auto';
    updateSendButtonState();
    
    // 添加到对话历史
    conversationHistory.push({ role: 'user', content: message });
    
    // 显示加载动画
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1024
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        // 添加助手回复到对话历史
        conversationHistory.push({ role: 'assistant', content: assistantMessage });
        
        // 显示助手回复
        addMessage('assistant', assistantMessage);
        
    } catch (error) {
        console.error('API调用错误:', error);
        addMessage('assistant', `天机晦涩，连接中断...\n\n错误信息：${error.message}\n\n请检查API密钥是否正确，或稍后重试。`);
    } finally {
        showLoading(false);
    }
}

// ==================== 加载状态 ====================
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
        sendBtn.disabled = true;
    } else {
        loadingOverlay.classList.remove('active');
        updateSendButtonState();
    }
}

// ==================== 工具函数 ====================
// 清空对话历史（可选功能）
function clearConversation() {
    conversationHistory = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];
    chatContainer.innerHTML = '';
    // 重新添加欢迎消息
    addMessage('assistant', `善哉善哉，缘主驾到。吾乃玄机子，通晓周易八卦、紫微斗数、塔罗占卜之术。\n\n汝有何困惑？可问事业前程、姻缘情感、财运健康，亦可抽一签问问今日运势。\n\n🌟 命运箴言：问卜者，求的是心安；解惑者，予的是方向。`);
}
