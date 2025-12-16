// Cloudflare Pages Function - API代理
// API密钥存储在Cloudflare环境变量中，不会暴露在前端代码
// 支持多线路：线路1(DeepSeek) 和 线路2(Qwen3)

// 主线路配置（ModelScope）
const MAIN_ROUTES = {
    1: { name: 'DeepSeek-V3', model: 'deepseek-ai/DeepSeek-V3.2', endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions', provider: 'modelscope' },
    2: { name: 'Qwen3-80B', model: 'Qwen/Qwen3-Next-80B-A3B-Instruct', endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions', provider: 'modelscope' },
    3: { name: 'DeepSeek-R1', model: 'deepseek-ai/DeepSeek-R1-0528', endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions', provider: 'modelscope' },
    4: { name: 'Qwen3-235B', model: 'Qwen/Qwen3-235B-A22B', endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions', provider: 'modelscope' }
};

// 备用线路配置（iFlow）
const BACKUP_ROUTES = {
    1: { name: '备用-DeepSeek', model: 'deepseek-v3', endpoint: 'https://apis.iflow.cn/v1/chat/completions', provider: 'iflow' },
    2: { name: '备用-Qwen3', model: 'qwen3-235b', endpoint: 'https://apis.iflow.cn/v1/chat/completions', provider: 'iflow' },
    3: { name: '备用-R1', model: 'deepseek-r1', endpoint: 'https://apis.iflow.cn/v1/chat/completions', provider: 'iflow' },
    4: { name: '备用-Qwen235B', model: 'qwen3-235b', endpoint: 'https://apis.iflow.cn/v1/chat/completions', provider: 'iflow' }
};

// 合并所有线路
const ROUTES = {
    ...MAIN_ROUTES,
    // 备用线路从5开始，与主线路一一对应
    5: BACKUP_ROUTES[1],
    6: BACKUP_ROUTES[2],
    7: BACKUP_ROUTES[3],
    8: BACKUP_ROUTES[4]
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
                // 优先使用adcode.o，如果格式异常则使用adcode.r
                const adcodeO = geoData.adcode.o || '';
                const adcodeR = geoData.adcode.r || '';
                // 检查adcode.o是否有效（不是"市市 - "这种异常格式）
                if (adcodeO && !adcodeO.startsWith('市市') && adcodeO.length > 5) {
                    location = adcodeO;
                } else if (adcodeR) {
                    location = adcodeR;
                } else {
                    location = '未知位置';
                }
            }
        }
    } catch (e) {
        // 地理位置查询失败，使用Cloudflare提供的信息
        const cfCountry = request.headers.get('CF-IPCountry') || '';
        const cfCity = request.cf?.city || '';
        location = [cfCountry, cfCity].filter(Boolean).join(' ') || '未知位置';
    }
    
    try {
        // 获取请求体
        const body = await request.json();
        
        // 获取线路选择（默认线路1）
        const routeId = body.route || 1;
        const route = ROUTES[routeId] || ROUTES[1];
        
        // 线路对应关系：主线路1-4对应备用线路5-8
        // 如果主线路繁忙，建议切换到对应备用；如果备用繁忙，建议切换到下一组
        const routeMapping = {
            1: { backup: 5, next: 2, backupLabel: '备用1', nextLabel: '线路2' },
            2: { backup: 6, next: 3, backupLabel: '备用2', nextLabel: '线路3' },
            3: { backup: 7, next: 4, backupLabel: '备用3', nextLabel: '线路4' },
            4: { backup: 8, next: 1, backupLabel: '备用4', nextLabel: '线路1' },
            5: { backup: 2, next: 6, backupLabel: '线路2', nextLabel: '备用2' },
            6: { backup: 3, next: 7, backupLabel: '线路3', nextLabel: '备用3' },
            7: { backup: 4, next: 8, backupLabel: '线路4', nextLabel: '备用4' },
            8: { backup: 1, next: 5, backupLabel: '线路1', nextLabel: '备用1' }
        };
        const currentMapping = routeMapping[routeId] || routeMapping[1];
        const currentLabel = routeId <= 4 ? `线路${routeId}` : `备用${routeId - 4}`;
        
        // 根据provider选择API密钥
        let API_KEY;
        if (route.provider === 'iflow') {
            API_KEY = env.IFLOW_API_KEY;
            if (!API_KEY) {
                return new Response(JSON.stringify({
                    error: 'iFlow API密钥未配置，请在Cloudflare Pages设置中添加 IFLOW_API_KEY 环境变量'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        } else if (route.provider === 'huggingface') {
            API_KEY = env.HUGGINGFACE_API_KEY;
            if (!API_KEY) {
                return new Response(JSON.stringify({
                    error: 'Hugging Face API密钥未配置，请在Cloudflare Pages设置中添加 HUGGINGFACE_API_KEY 环境变量'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        } else {
            API_KEY = env.MODELSCOPE_API_KEY;
            if (!API_KEY) {
                return new Response(JSON.stringify({
                    error: 'ModelScope API密钥未配置，请在Cloudflare Pages设置中添加 MODELSCOPE_API_KEY 环境变量'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }
        
        // 使用选定线路的模型
        const requestBody = {
            ...body,
            model: route.model
        };
        delete requestBody.route;
        
        // 转发请求到API
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
        
        // 处理400错误（参数错误）
        if (response.status === 400) {
            console.error('400错误详情:', JSON.stringify(data));
            return new Response(JSON.stringify({
                error: '请求参数错误',
                details: data,
                choices: [{
                    message: {
                        content: `🔮 **线路${routeId}暂不可用**\n\n该线路模型暂时无法使用，建议您切换到**其他线路**继续问卦。\n\n👆 点击右上角的线路按钮即可切换。`
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
        
        // 处理429速率限制错误
        if (response.status === 429) {
            return new Response(JSON.stringify({
                error: '🔮 天机繁忙，请稍后再试',
                route_error: true,
                current_route: routeId,
                suggest_route: currentMapping.backup,
                choices: [{
                    message: {
                        content: `🔮 **${currentLabel}繁忙**\n\n当前线路请求人数较多，建议您切换到**${currentMapping.backupLabel}**继续问卦。\n\n如果${currentMapping.backupLabel}也繁忙，可以尝试**${currentMapping.nextLabel}**。\n\n👆 点击右上角的线路按钮即可切换。\n\n💡 **多线路体验**：每条线路使用不同的AI模型，回答风格各异，同一问题可尝试多条线路获得不同角度的解读！`
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
