// Cloudflare Pages Function - 管理后台API
// 用于获取对话记录
// 优化：默认只读取当天数据，减少KV读取次数
// 兼容新旧key格式

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
                dateRange: { min: null, max: null },
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
        const dateParam = url.searchParams.get('date');
        const today = new Date().toISOString().split('T')[0];
        
        // 确定要查询的日期
        const targetDate = dateParam || today;
        
        // 获取所有keys（用于统计和日期范围）
        const allKeys = await CHAT_LOGS.list({ prefix: 'chat_' });
        const totalCount = allKeys.keys.length;
        
        // 收集所有日期（用于日历范围）
        const allDates = new Set();
        
        // 根据参数决定读取范围
        // 新格式key: chat_YYYY-MM-DD_timestamp_random
        // 旧格式key: chat_timestamp_random
        const records = [];
        const ipSet = new Set();
        let todayCount = 0;
        
        for (const key of allKeys.keys) {
            // 解析key中的日期（新格式）
            const keyParts = key.name.split('_');
            let keyDate = null;
            
            // 新格式: chat_2024-12-17_timestamp_random
            if (keyParts.length >= 3 && keyParts[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
                keyDate = keyParts[1];
            }
            
            // 判断是否需要加载这条记录
            let shouldLoad = false;
            if (loadAll) {
                shouldLoad = true;
            } else if (keyDate === targetDate) {
                // 新格式匹配日期
                shouldLoad = true;
            } else if (!keyDate) {
                // 旧格式：需要读取记录来判断日期
                // 为了节省KV读取，旧格式数据只在加载全部时显示
                // 或者在第一次加载时迁移
                shouldLoad = loadAll;
            }
            
            if (shouldLoad) {
                const record = await CHAT_LOGS.get(key.name, { type: 'json' });
                if (record) {
                    records.push(record);
                    if (record.ip) {
                        ipSet.add(record.ip);
                    }
                    // 从timestamp获取日期
                    if (record.timestamp) {
                        const recordDate = record.timestamp.split('T')[0];
                        allDates.add(recordDate);
                        if (recordDate === today) {
                            todayCount++;
                        }
                    }
                }
            } else if (keyDate) {
                // 新格式但不需要加载，仍然记录日期用于日历范围
                allDates.add(keyDate);
            }
        }
        
        // 计算日期范围
        const sortedDates = Array.from(allDates).sort();
        const dateRange = {
            min: sortedDates[0] || today,
            max: sortedDates[sortedDates.length - 1] || today,
            available: sortedDates
        };
        
        return new Response(JSON.stringify({
            records: records,
            stats: {
                total: totalCount,
                today: todayCount,
                uniqueIPs: ipSet.size,
                loaded: records.length,
                loadAll: loadAll
            },
            dateRange: dateRange
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
