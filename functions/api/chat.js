// Cloudflare Pages Function - API代理
// API密钥存储在Cloudflare环境变量中，不会暴露在前端代码

export async function onRequestPost(context) {
    const { request, env } = context;
    
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
