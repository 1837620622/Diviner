'use strict';
let adminPassword='';
let isLoggedIn=false;
let lastPayload=null;
const providerNames={groq:'灵台甲',bai:'灵台乙',zhipu:'灵台丙'};
const $=id=>document.getElementById(id);
function icons(){if(window.lucide) window.lucide.createIcons()}
function esc(v){const d=document.createElement('div');d.textContent=String(v??'');return d.innerHTML}
function localDateKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function showErr(msg){const e=$('errorMsg');e.textContent=msg;e.style.display='block';setTimeout(()=>e.style.display='none',2600)}
async function login(){
  const pwd=$('passwordInput').value.trim(); if(!pwd)return showErr('请输入管理口令');
  $('loginBtn').disabled=true;
  try{
    const resp=await fetch('/api/admin/records?probe=1',{headers:{'X-Admin-Password':pwd},cache:'no-store'});
    if(resp.status===401)throw new Error('密码错误或未授权');
    if(!resp.ok)throw new Error('后台校验失败 · '+resp.status);
    adminPassword=pwd;isLoggedIn=true;
    $('loginContainer').style.display='none';$('adminContainer').style.display='block';
    initDate();await Promise.all([loadRecords(localDateKey()),loadHealth()]);
  }catch(e){showErr(e.message||'连接失败')}finally{$('loginBtn').disabled=false}
}
function logout(){adminPassword='';isLoggedIn=false;lastPayload=null;$('adminContainer').style.display='none';$('loginContainer').style.display='grid';$('passwordInput').value=''}
function initDate(){const el=$('dateSelector');if(el.dataset.ready)return;el.dataset.ready='1';el.value=localDateKey();el.addEventListener('change',()=>el.value&&loadRecords(el.value))}
async function loadHealth(){
  try{const r=await fetch('/api/health',{cache:'no-store',headers:{'X-Admin-Password':adminPassword}});if(!r.ok)throw new Error();const d=await r.json();$('providerGrid').innerHTML=(d.providers||[]).map(p=>`<div class="provider ${p.configured?'on':''}"><span>${esc(providerNames[p.id]||p.id)}</span><span class="dot" title="${p.configured?'已配置':'未配置'}"></span></div>`).join('')||'<div class="provider"><span>暂无线路</span><span class="dot"></span></div>';$('healthTime').textContent='检查时间 · '+new Date(d.at||Date.now()).toLocaleString('zh-CN')}
  catch{$('providerGrid').innerHTML='<div class="provider"><span>状态读取失败</span><span class="dot"></span></div>';$('healthTime').textContent='可稍后手动刷新'}
}
async function loadRecords(date=null,all=false){
  if(!isLoggedIn)return;const list=$('recordsList');$('loadModeLabel').textContent=all?'最近 250 条':(date||'今日');list.innerHTML='<div class="loading"><div class="spinner"></div>正在读取问卜档案</div>';
  try{let url='/api/admin/records?limit=250';if(all)url+='&all=true';else url+='&date='+encodeURIComponent(date||localDateKey());const r=await fetch(url,{headers:{'X-Admin-Password':adminPassword},cache:'no-store'});if(r.status===401){logout();throw new Error('登录已失效')}if(!r.ok)throw new Error('读取失败 · '+r.status);lastPayload=await r.json();renderRecords(lastPayload)}catch(e){list.innerHTML='<div class="empty">'+esc(e.message||'读取失败')+'</div>'}
}
function renderRecords(data){
  const rows=data?.records||[];$('totalRecords').textContent=(data?.stats?.total==null?'—':data.stats.total);$('todayRecords').textContent=data?.stats?.today??0;$('uniqueIPs').textContent=data?.stats?.uniqueIPs??0;
  if(data?.dateRange){const el=$('dateSelector');if(data.dateRange.min)el.min=data.dateRange.min;if(data.dateRange.max)el.max=data.dateRange.max}
  const q=$('searchInput').value.trim().toLowerCase();const filtered=!q?rows:rows.filter(r=>[r.ip,r.location,r.question,r.answer].some(v=>String(v||'').toLowerCase().includes(q)));
  if(!filtered.length){$('recordsList').innerHTML='<div class="empty">'+(rows.length?'没有符合筛选条件的档案':'这一日尚无问卜记录')+'</div>';return}
  const groups={};for(const r of filtered){const ip=r.ip||'未知访客';(groups[ip]??=[]).push(r)}
  const ips=Object.keys(groups).sort((a,b)=>new Date(groups[b][0]?.timestamp||0)-new Date(groups[a][0]?.timestamp||0));let html='',idx=0,answerIdx=0;
  for(const ip of ips){const arr=groups[ip].sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));const first=arr[0]||{};html+=`<section class="ip-group" id="group-${idx}"><div class="ip-head" data-group="${idx}" tabindex="0" role="button"><div class="ip-main"><span class="ip mono">${esc(ip)}</span><span class="loc">${esc(first.location||'地区未识别')}</span><span class="cnt">${arr.length} 次 · ${esc(new Date(first.timestamp||Date.now()).toLocaleString('zh-CN'))}</span></div><span class="chev">⌄</span></div><div class="ip-body">`;
    for(const rec of arr){const ans=String(rec.answer||'');const long=ans.length>260;const ai=answerIdx++;html+=`<article class="record"><div class="record-meta"><span class="tag">灵台</span><span class="time">${esc(new Date(rec.timestamp||Date.now()).toLocaleString('zh-CN'))}${rec.vision?' · 图象':''}</span></div><div class="conv"><div class="turn user"><div class="role">所问</div><div class="text">${esc(rec.question||'')}</div></div><div class="turn"><div class="role">玄机子</div><div id="answer-${ai}" class="text ${long?'collapsed-txt':''}">${format(ans)}</div>${long?`<button class="expand" data-answer="${ai}">展开全文</button>`:''}</div></div></article>`}
    html+='</div></section>';idx++}
  $('recordsList').innerHTML=html;
  document.querySelectorAll('.ip-head').forEach(h=>{const fn=()=>h.closest('.ip-group')?.classList.toggle('collapsed');h.addEventListener('click',fn);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})});
  document.querySelectorAll('.expand').forEach(b=>b.addEventListener('click',()=>{const el=$('answer-'+b.dataset.answer);const c=el.classList.toggle('collapsed-txt');b.textContent=c?'展开全文':'收起'}));icons()
}
function format(v){let s=esc(v);s=s.replace(/^#{1,3}\s*(.+)$/gm,'<div class="section-title">$1</div>');s=s.replace(/【([^】]+)】/g,'<div class="section-title">$1</div>');s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');s=s.replace(/「([^」]+)」/g,'<mark>$1</mark>');return s.replace(/\n/g,'<br>')}
$('loginBtn').addEventListener('click',login);$('passwordInput').addEventListener('keydown',e=>e.key==='Enter'&&login());$('logoutBtn').addEventListener('click',logout);$('todayBtn').addEventListener('click',()=>{$('dateSelector').value=localDateKey();loadRecords(localDateKey())});$('allBtn').addEventListener('click',()=>{$('dateSelector').value='';loadRecords(null,true)});$('refreshBtn').addEventListener('click',()=>Promise.all([$('dateSelector').value?loadRecords($('dateSelector').value):loadRecords(null,true),loadHealth()]));$('searchInput').addEventListener('input',()=>lastPayload&&renderRecords(lastPayload));
icons();
