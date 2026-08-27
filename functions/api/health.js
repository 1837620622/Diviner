// 管理后台线路状态：只返回是否配置，不返回密钥、额度或完整上游地址。
const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
function json(obj, status=200){ return new Response(JSON.stringify(obj), {status, headers:H}); }
export async function onRequestGet({ request, env }) {
  const expected=String(env.ADMIN_PASSWORD||'').trim();
  if(!expected) return json({error:'后台尚未配置'},503);
  const supplied=String(request.headers.get('X-Admin-Password')||'').trim();
  if(supplied!==expected) return json({error:'未授权访问'},401);
  const providers = [
    ['cloudflare', !!env.AI],
    ['groq', !!env.GROQ_API_KEY],
    ['zhipu', !!env.ZHIPU_API_KEY],
  ].map(([id, configured]) => ({ id, configured }));
  return json({ ok: providers.some(p=>p.configured), providers, at:new Date().toISOString() });
}
export async function onRequestOptions(){ return new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'X-Admin-Password'}}); }
