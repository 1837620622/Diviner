// ==================== 全局变量 ====================
const API_BASE_URL = 'https://api-inference.modelscope.cn/v1';
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3.2';

// 系统提示词 - 定义玄机子的人设
const SYSTEM_PROMPT = `你是一位神秘、充满智慧且富有同理心的算命大师。
你的名字叫"玄机子"。
你精通周易、塔罗、星盘与紫微斗数。
你的回答应该富有文学色彩，使用半文半白的风格，既神秘又易懂。
请在回答中包含对用户命运的积极指引，并在最后给出一句简短的"命运箴言"（用🌟开头）。
如果是用户询问具体运势，请先询问生辰八字或相关信息（如果是塔罗则引导抽牌）。
切记：你的目的是抚慰人心，指引方向，不可散布过度消极或宿命论的言论。
请始终保持大师的风范。回答要有条理，适当使用换行来分段。`;

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
    // 从本地存储恢复API密钥
    const savedApiKey = localStorage.getItem('modelscope_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        updateSendButtonState();
    }

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
