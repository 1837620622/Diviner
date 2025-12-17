// Cloudflare Pages Function - 管理后台API
// 用于获取对话记录
// 优化：默认只读取当天数据，减少KV读取次数

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
        
        // 解析URL参数
        const url = new URL(request.url);
        const loadAll = url.searchParams.get('all') === 'true';
        const today = new Date().toISOString().split('T')[0];
        
        // 根据参数决定读取范围
        // 新格式key: chat_YYYY-MM-DD_timestamp_random
        // 旧格式key: chat_timestamp_random
        let keys;
        if (loadAll) {
            // 读取全部：获取所有以chat_开头的记录
            keys = await CHAT_LOGS.list({ prefix: 'chat_' });
        } else {
            // 默认只读取当天：使用日期前缀筛选（新格式）
            keys = await CHAT_LOGS.list({ prefix: `chat_${today}_` });
        }
        
        const records = [];
        const ipSet = new Set();
        let todayCount = 0;
        
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
        
        // 获取总记录数（用于统计显示）
        let totalCount = records.length;
        if (!loadAll) {
            // 如果只读取了当天数据，额外获取总数
            const allKeys = await CHAT_LOGS.list({ prefix: 'chat_' });
            totalCount = allKeys.keys.length;
        }
        
        return new Response(JSON.stringify({
            records: records,
            stats: {
                total: totalCount,
                today: todayCount,
                uniqueIPs: ipSet.size,
                loaded: records.length,
                loadAll: loadAll
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
