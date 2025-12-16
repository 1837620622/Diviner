// Cloudflare Pages Function - API代理
// API密钥存储在Cloudflare环境变量中，不会暴露在前端代码

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // 获取用户IP地址
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                     'unknown';
    
    // 从环境变量获取API密钥
    const API_KEY = env.MODELSCOPE_API_KEY;
    
    if (!API_KEY) {
        return new Response(JSON.stringify({
            error: 'API密钥未配置，请在Cloudflare Pages设置中添加 MODELSCOPE_API_KEY 环境变量'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    try {
        // 获取请求体
        const body = await request.json();
        
        // 转发请求到ModelScope API
        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });
        
        // 获取响应
        const data = await response.json();
        
        // 处理429速率限制错误
        if (response.status === 429) {
            return new Response(JSON.stringify({
                error: '🔮 天机繁忙，请稍后再试',
                message: '当前请求人数较多，请等待30秒后重试。',
                choices: [{
                    message: {
                        content: '🔮 **天机繁忙**\n\n当前问卦者众多，玄机子正在为其他有缘人推演命数。\n\n请稍候30秒后再次问卦，或可先整理好您要询问的信息。\n\n🌟 **命运箴言**：耐心等待，机缘自来。'
                    }
                }]
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 保存对话记录到KV存储（如果配置了）
        if (env.CHAT_LOGS && data.choices && data.choices[0]?.message?.content) {
            try {
                // 提取用户最后一条消息
                const messages = body.messages || [];
                const userMessages = messages.filter(m => m.role === 'user');
                const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
                const assistantResponse = data.choices[0].message.content;
                
                // 生成唯一ID
                const recordId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // 保存记录
                await env.CHAT_LOGS.put(recordId, JSON.stringify({
                    id: recordId,
                    ip: clientIP,
                    timestamp: new Date().toISOString(),
                    question: lastUserMessage,
                    answer: assistantResponse
                }), {
                    // 保留90天
                    expirationTtl: 90 * 24 * 60 * 60
                });
            } catch (logError) {
                // 记录失败不影响正常响应
                console.error('保存对话记录失败:', logError);
            }
        }
        
        // 返回响应
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({
            error: '请求处理失败: ' + error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

// 处理CORS预检请求
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
