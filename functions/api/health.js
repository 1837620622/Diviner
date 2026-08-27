// 管理后台线路状态：只返回是否配置，不返回密钥、额度或完整上游地址。
const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
function json(obj, status=200){ return new Response(JSON.stringify(obj), {status, headers:H}); }
// 先各自做 SHA-256 摘要再比对，长度恒定，天然满足 timingSafeEqual 的等长要求，
// 也能抵御基于响应时差的口令逐字节爆破。
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ha = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const hb = await crypto.subtle.digest('SHA-256', enc.encode(b));
  return crypto.subtle.timingSafeEqual(ha, hb);
}
export async function onRequestGet({ request, env }) {
  const expected=String(env.ADMIN_PASSWORD||'').trim();
  if(!expected) return json({error:'后台尚未配置'},503);
  const supplied=String(request.headers.get('X-Admin-Password')||'').trim();
  if(!supplied || !(await safeEqual(supplied, expected))) return json({error:'未授权访问'},401);
  // 只列当前真实使用的三条线路；Workers AI 已不作推演线路，不再展示。
  const providers = [
    ['groq', !!env.GROQ_API_KEY],
    ['bai', !!env.B_AI_API_KEY],
    ['zhipu', !!env.ZHIPU_API_KEY],
  ].map(([id, configured]) => ({ id, configured }));
  return json({ ok: providers.some(p=>p.configured), providers, at:new Date().toISOString() });
}
export async function onRequestOptions(){ return new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'X-Admin-Password'}}); }
