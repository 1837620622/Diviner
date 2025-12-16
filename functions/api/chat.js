// Cloudflare Pages Function - API代理
// API密钥存储在Cloudflare环境变量中，不会暴露在前端代码
// 支持多线路：线路1(DeepSeek) 和 线路2(Qwen3)

// 线路配置
const ROUTES = {
    1: {
        name: 'DeepSeek',
        model: 'deepseek-ai/DeepSeek-V3.2',
        endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions'
    },
    2: {
        name: 'Qwen3',
        model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
        endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions'
    }
};

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // 获取用户IP地址（首选IPv4）
    let clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
                   'unknown';
    
    // 如果是IPv6映射的IPv4地址，提取IPv4部分
    if (clientIP.startsWith('::ffff:')) {
        clientIP = clientIP.substring(7);
    }
    
    // 使用VORE-API查询IP地理位置（支持IPv4和IPv6）
    let location = '未知位置';
    try {
        const geoResponse = await fetch(`https://api.vore.top/api/IPdata?ip=${clientIP}`);
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.code === 200 && geoData.adcode) {
                // 使用adcode.o字段，格式为"广东省广州市增城 - 电信"
                location = geoData.adcode.o || '未知位置';
            }
        }
    } catch (e) {
        // 地理位置查询失败，使用Cloudflare提供的信息
        const cfCountry = request.headers.get('CF-IPCountry') || '';
        const cfCity = request.cf?.city || '';
        location = [cfCountry, cfCity].filter(Boolean).join(' ') || '未知位置';
    }
    
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
        
        // 获取线路选择（默认线路1）
        const routeId = body.route || 1;
        const route = ROUTES[routeId] || ROUTES[1];
        const otherRouteId = routeId === 1 ? 2 : 1;
        const otherRoute = ROUTES[otherRouteId];
        
        // 使用选定线路的模型
        const requestBody = {
            ...body,
            model: route.model
        };
        delete requestBody.route;
        
        // 转发请求到ModelScope API
        const response = await fetch(route.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        // 获取响应
        const data = await response.json();
        
        // 处理429速率限制错误
        if (response.status === 429) {
            return new Response(JSON.stringify({
                error: '🔮 天机繁忙，请稍后再试',
                route_error: true,
                current_route: routeId,
                suggest_route: otherRouteId,
                choices: [{
                    message: {
                        content: `🔮 **线路${routeId}繁忙**\n\n当前线路请求人数较多，建议您切换到**线路${otherRouteId}**继续问卦。\n\n👆 点击右上角的线路按钮即可切换。\n\n🌟 条条大路通天机，换个线路试试看！`
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
                    location: location,
                    route: routeId,
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
