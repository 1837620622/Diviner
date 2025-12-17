// Cloudflare Pages Function - 管理后台API
// 用于获取对话记录
// 优化版：使用prefix筛选，最大化节省KV读取次数
// 新格式key: chat_YYYY-MM-DD_timestamp_random

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
        const CHAT_LOGS = env.CHAT_LOGS;
        
        if (!CHAT_LOGS) {
            return new Response(JSON.stringify({
                records: [],
                stats: { total: 0, today: 0, uniqueIPs: 0 },
                dateRange: { min: null, max: null }
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        const url = new URL(request.url);
        const loadAll = url.searchParams.get('all') === 'true';
        const dateParam = url.searchParams.get('date');
        const today = new Date().toISOString().split('T')[0];
        const targetDate = dateParam || today;
        
        // ========== 第一步：只用list获取keys，解析日期范围（不消耗get配额）==========
        const allKeys = await CHAT_LOGS.list({ prefix: 'chat_' });
        const allDates = new Set();
        
        // 从key名解析日期（新格式: chat_YYYY-MM-DD_timestamp_random）
        for (const key of allKeys.keys) {
            const match = key.name.match(/^chat_(\d{4}-\d{2}-\d{2})_/);
            if (match) {
                allDates.add(match[1]);
            }
        }
        
        // ========== 第二步：按需读取记录 ==========
        let keysToLoad;
        if (loadAll) {
            // 加载全部：直接用已获取的keys
            keysToLoad = allKeys.keys;
        } else {
            // 按日期筛选：用prefix精确获取（节省读取）
            const filtered = await CHAT_LOGS.list({ prefix: `chat_${targetDate}_` });
            keysToLoad = filtered.keys;
        }
        
        // 读取记录
        const records = [];
        const ipSet = new Set();
        let todayCount = 0;
        
        for (const key of keysToLoad) {
            const record = await CHAT_LOGS.get(key.name, { type: 'json' });
            if (record) {
                records.push(record);
                if (record.ip) ipSet.add(record.ip);
                if (record.timestamp?.startsWith(today)) todayCount++;
            }
        }
        
        // 计算日期范围
        const sortedDates = Array.from(allDates).sort();
        
        return new Response(JSON.stringify({
            records: records,
            stats: {
                total: allKeys.keys.length,
                today: todayCount,
                uniqueIPs: ipSet.size,
                loaded: records.length
            },
            dateRange: {
                min: sortedDates[0] || today,
                max: sortedDates[sortedDates.length - 1] || today,
                available: sortedDates
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
