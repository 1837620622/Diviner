// Cloudflare Pages Function - 管理后台API
// 用于获取对话记录

const ADMIN_PASSWORD = 'chuankangkk';

export async function onRequestGet(context) {
    const { request, env } = context;
    
    // 验证管理员密码
    const password = request.headers.get('X-Admin-Password');
    if (password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({
            error: '未授权访问'
        }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    try {
        // 从KV存储获取对话记录
        const CHAT_LOGS = env.CHAT_LOGS;
        
        if (!CHAT_LOGS) {
            return new Response(JSON.stringify({
                records: [],
                stats: { total: 0, today: 0, uniqueIPs: 0 },
                message: 'KV存储未配置，请在Cloudflare Dashboard中创建CHAT_LOGS KV命名空间并绑定'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 获取所有记录的键
        const keys = await CHAT_LOGS.list();
        const records = [];
        const ipSet = new Set();
        let todayCount = 0;
        const today = new Date().toISOString().split('T')[0];
        
        // 获取每条记录
        for (const key of keys.keys) {
            const record = await CHAT_LOGS.get(key.name, { type: 'json' });
            if (record) {
                records.push(record);
                if (record.ip) {
                    ipSet.add(record.ip);
                }
                if (record.timestamp && record.timestamp.startsWith(today)) {
                    todayCount++;
                }
            }
        }
        
        return new Response(JSON.stringify({
            records: records,
            stats: {
                total: records.length,
                today: todayCount,
                uniqueIPs: ipSet.size
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({
            error: '获取记录失败: ' + error.message
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
        }
    });
}
