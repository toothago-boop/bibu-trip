(function(){
'use strict';
const DATA=window.BIBU_DATA;
const STORAGE='bibu-trip-state-v3';
const CHECKS='bibu-trip-checks-v3';
const NOTES='bibu-trip-notes-v3';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const uid=()=>globalThis.crypto?.randomUUID?.()||'e-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function withIds(days){return days.map(d=>({...d,events:d.events.map(e=>({...e,id:e.id||uid()}))}))}
let state={days:withIds(clone(DATA.days)),updatedAt:Date.now()};
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved?.days?.length)state={...saved,days:withIds(saved.days)}}catch{}
let activeDay=1,placeType='全部',dragId=null,toastTimer,changeListeners=[];

function save({notify=true}={}){state.updatedAt=Date.now();localStorage.setItem(STORAGE,JSON.stringify(state));if(notify)changeListeners.forEach(fn=>fn(clone(state)));}
function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900)}
function mapsSearch(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)}
function mapsDir(a,b,mode){return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(a)+'&destination='+encodeURIComponent(b)+'&travelmode='+mode}
function minutes(time){const [h,m]=String(time).split(':').map(Number);return h*60+m}
function day(){return state.days.find(d=>d.n===activeDay)||state.days[0]}

function renderTabs(){
  $('#dayTabs').innerHTML=state.days.map((d,i)=>`<button class="day-tab ${d.n===activeDay?'active':''}" style="--day-color:${DATA.dayColors[i]}" data-day="${d.n}" role="tab" aria-selected="${d.n===activeDay}"><b>Day ${d.n}</b><span>${d.date} 星期${d.dow}</span></button>`).join('');
  $$('.day-tab').forEach(b=>b.onclick=()=>{activeDay=Number(b.dataset.day);renderTabs();renderDay();renderWarnings()});
}
function routeButtons(prev,e){
  if(!prev?.place||!e.place||prev.place===e.place)return e.place?`<a class="small-btn map" href="${mapsSearch(e.place)}" target="_blank" rel="noopener">📍 地圖</a>`:'';
  return `<a class="small-btn map" href="${mapsSearch(e.place)}" target="_blank" rel="noopener">📍 地圖</a><a class="small-btn" href="${mapsDir(prev.place,e.place,'walking')}" target="_blank" rel="noopener">🚶 行路</a><a class="small-btn" href="${mapsDir(prev.place,e.place,'driving')}" target="_blank" rel="noopener">🚗 行車</a>`;
}
function renderDay(){
  const d=day(),color=DATA.dayColors[d.n-1],events=d.events;
  $('#dayView').innerHTML=`<article class="day-card" style="--day-color:${color}"><header class="day-banner"><span class="kicker">DAY ${d.n} · ${d.date} 星期${d.dow}</span><h3>${esc(d.title)}</h3><p>${esc(d.sub)}</p><div class="route-line">🧭 ${esc(d.route)}</div></header><div class="timeline">${events.length?events.map((e,i)=>{const prev=events[i-1];return `<div class="event" draggable="true" data-id="${e.id}"><div class="event-time">${esc(e.time)}</div><div class="event-dot"></div><div class="event-main"><h4>${esc(e.title)}</h4><p>${esc(e.desc)}</p><div class="chips"><span class="chip">${esc(e.tag||'行程')}</span>${Number(e.travelMin)?`<span class="chip">由上一站約 ${Number(e.travelMin)} 分鐘</span>`:''}</div><div class="event-actions">${routeButtons(prev,e)}<button class="small-btn edit" data-edit="${e.id}" type="button">✎ 修改</button><span class="order-btns"><button class="small-btn" data-move="${e.id}" data-dir="-1" type="button" aria-label="向上移">↑</button><button class="small-btn" data-move="${e.id}" data-dir="1" type="button" aria-label="向下移">↓</button></span><button class="small-btn" data-delete="${e.id}" type="button">刪除</button></div></div></div>`}).join(''):'<div class="empty">呢日未有行程</div>'}</div></article>`;
  $$('[data-edit]').forEach(b=>b.onclick=()=>openDialog(b.dataset.edit));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteEvent(b.dataset.delete));
  $$('[data-move]').forEach(b=>b.onclick=()=>moveEvent(b.dataset.move,Number(b.dataset.dir)));
  $$('.event').forEach(el=>{
    el.ondragstart=()=>{dragId=el.dataset.id;el.style.opacity='.45'};
    el.ondragend=()=>{dragId=null;el.style.opacity=''};
    el.ondragover=e=>e.preventDefault();
    el.ondrop=e=>{e.preventDefault();if(dragId&&dragId!==el.dataset.id)dropEvent(dragId,el.dataset.id)};
  });
}
function renderWarnings(){
  const d=day(),items=[];
  for(let i=1;i<d.events.length;i++){
    const prev=d.events[i-1],current=d.events[i],gap=minutes(current.time)-minutes(prev.time),need=Number(current.travelMin)||0;
    if(gap<0)items.push({bad:true,title:`${current.title} 時間早過上一站`,text:'請調整時間或行程次序。'});
    else if(need&&gap<need+10)items.push({bad:true,title:`${prev.title} → ${current.title}`,text:`只預留 ${gap} 分鐘；路程約 ${need} 分鐘，建議最少再加 ${need+10-gap} 分鐘緩衝。`});
  }
  $('#warningList').innerHTML=items.length?items.map(x=>`<article class="warning bad"><b>⚠️ ${esc(x.title)}</b><span>${esc(x.text)}</span></article>`).join(''):`<article class="warning good"><b>✓ Day ${d.n} 暫時未見明顯時間衝突</b><span>到埗後仍建議按天氣、排隊及交通彈性調整。</span></article>`;
}
function openDialog(id){
  const d=day(),e=id?d.events.find(x=>x.id===id):null;
  $('#dialogTitle').textContent=e?'修改行程':'加入行程';$('#eventId').value=e?.id||'';$('#eventDay').value=String(e?d.n:activeDay);$('#eventTime').value=e?.time||'12:00';$('#eventTitle').value=e?.title||'';$('#eventDesc').value=e?.desc||'';$('#eventTag').value=e?.tag||'景點';$('#eventPlace').value=e?.place||'';$('#eventTravel').value=Number(e?.travelMin)||0;$('#eventMode').value=e?.mode||'walking';$('#eventDialog').showModal();
}
function closeDialog(){$('#eventDialog').close()}
function deleteEvent(id){if(!confirm('確定刪除呢個行程？'))return;const d=day();d.events=d.events.filter(e=>e.id!==id);save();renderAll();showToast('行程已刪除')}
function moveEvent(id,dir){const d=day(),i=d.events.findIndex(e=>e.id===id),to=i+dir;if(i<0||to<0||to>=d.events.length)return;[d.events[i],d.events[to]]=[d.events[to],d.events[i]];save();renderAll();showToast('行程次序已更新')}
function dropEvent(fromId,toId){const d=day(),from=d.events.findIndex(e=>e.id===fromId),to=d.events.findIndex(e=>e.id===toId);if(from<0||to<0)return;const [item]=d.events.splice(from,1);d.events.splice(to,0,item);save();renderAll();showToast('行程次序已更新')}

function renderPlaces(){
  const types=['全部',...new Set(DATA.places.map(p=>p.type))];$('#placeFilters').innerHTML=types.map(t=>`<button class="filter ${t===placeType?'active':''}" data-type="${esc(t)}">${esc(t)}</button>`).join('');
  const q=$('#placeSearch').value.trim().toLowerCase(),list=DATA.places.filter(p=>(placeType==='全部'||p.type===placeType)&&[p.name,p.area,p.desc,...p.facts].join(' ').toLowerCase().includes(q));
  $('#placesGrid').innerHTML=list.length?list.map(p=>`<article class="place-card"><span class="type">${esc(p.type)} · ${esc(p.area)}</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><ul>${p.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><div class="event-actions"><a class="small-btn map" href="${mapsSearch(p.q)}" target="_blank" rel="noopener">📍 Google Maps</a>${p.url?`<a class="small-btn" href="${p.url}" target="_blank" rel="noopener">官方資料</a>`:''}</div></article>`).join(''):'<div class="empty">搵唔到相符地點</div>';
  $$('.filter').forEach(b=>b.onclick=()=>{placeType=b.dataset.type;renderPlaces()});
}
function renderEssentials(){
  $('#flightList').innerHTML=DATA.flights.map(x=>`<div class="compact-row"><b>${x[0]} · ${x[1]}</b><small>${x[2]}</small></div>`).join('');
  $('#hotelList').innerHTML=DATA.hotels.map(x=>`<div class="compact-row"><b>${x[0]}</b><small>${x[1]} · ${x[2]}</small><a class="small-btn map" href="${mapsSearch(x[3])}" target="_blank" rel="noopener">📍 地圖</a></div>`).join('');
  let checks={};try{checks=JSON.parse(localStorage.getItem(CHECKS)||'{}')}catch{}
  $('#checklist').innerHTML=DATA.checklist.map((x,i)=>`<label class="check-item ${checks[i]?'done':''}"><input type="checkbox" data-check="${i}" ${checks[i]?'checked':''}><span>${esc(x)}</span></label>`).join('');
  $$('[data-check]').forEach(c=>c.onchange=()=>{checks[c.dataset.check]=c.checked;localStorage.setItem(CHECKS,JSON.stringify(checks));c.closest('.check-item').classList.toggle('done',c.checked)});
}
function renderAll(){renderTabs();renderDay();renderWarnings();renderPlaces();}

$('#eventDay').innerHTML=DATA.days.map(d=>`<option value="${d.n}">Day ${d.n} · ${d.date}</option>`).join('');
$('#addEventButton').onclick=()=>openDialog();
$$('[data-go]').forEach(b=>b.onclick=()=>{const id=b.dataset.go;document.getElementById(id)?.scrollIntoView({behavior:'smooth'});$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.go===id))});
$('#eventForm').onsubmit=e=>{e.preventDefault();const targetDay=Number($('#eventDay').value),d=state.days.find(x=>x.n===targetDay),id=$('#eventId').value,entry={id:id||uid(),time:$('#eventTime').value,title:$('#eventTitle').value.trim(),desc:$('#eventDesc').value.trim(),tag:$('#eventTag').value,place:$('#eventPlace').value.trim(),travelMin:Number($('#eventTravel').value)||0,mode:$('#eventMode').value};if(!entry.title)return;const i=d.events.findIndex(x=>x.id===id);if(i>=0)d.events[i]=entry;else d.events.push(entry);activeDay=targetDay;save();closeDialog();renderAll();showToast(id?'行程已更新':'行程已加入')};
$$('[data-close]').forEach(b=>b.onclick=e=>{e.preventDefault();closeDialog()});
$('#resetButton').onclick=()=>{if(!confirm('確定還原全部預設行程？自訂修改會被清除。'))return;state={days:withIds(clone(DATA.days)),updatedAt:Date.now()};save();activeDay=1;renderAll();showToast('已還原預設行程')};
$('#placeSearch').oninput=renderPlaces;
const notes=$('#notes');notes.value=localStorage.getItem(NOTES)||'';let noteTimer;notes.oninput=()=>{clearTimeout(noteTimer);$('#saveHint').textContent='儲存中…';noteTimer=setTimeout(()=>{localStorage.setItem(NOTES,notes.value);$('#saveHint').textContent='✓ 已儲存於此裝置'},300)};
$('#exportButton').onclick=()=>{const pack={version:3,state,notes:notes.value,checks:JSON.parse(localStorage.getItem(CHECKS)||'{}')};$('#backupData').value=JSON.stringify(pack);$('#backupData').select();showToast('備份已產生')};
$('#importButton').onclick=()=>{try{const pack=JSON.parse($('#backupData').value.trim());if(!pack.state?.days)throw new Error();state={...pack.state,days:withIds(pack.state.days)};localStorage.setItem(NOTES,pack.notes||'');localStorage.setItem(CHECKS,JSON.stringify(pack.checks||{}));notes.value=pack.notes||'';save();renderAll();renderEssentials();showToast('備份已匯入')}catch{showToast('備份格式不正確')}};
function updateStatus(){const now=new Date(),start=new Date('2026-07-26T00:00:00+09:00'),end=new Date('2026-08-02T05:15:00+08:00');if(now<start){const diff=Math.ceil((start-now)/86400000);$('#tripStatus').textContent=diff+'日後出發';$('#todayHint').textContent='下一站：新千歲機場'}else if(now>end){$('#tripStatus').textContent='旅程已完成';$('#todayHint').textContent='北海道回憶已收藏'}else{const jp=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Tokyo'})),key=(jp.getMonth()+1)+'/'+jp.getDate(),d=state.days.find(x=>x.date===key);$('#tripStatus').textContent=d?'Day '+d.n+' · '+d.title:'旅程進行中';$('#todayHint').textContent=d?'今日 '+d.date:''}}
window.BiBuApp={
  getState:()=>clone(state),
  applyRemoteState:remote=>{if(remote?.days?.length){state={...remote,days:withIds(remote.days)};localStorage.setItem(STORAGE,JSON.stringify(state));renderAll();showToast('雲端行程已同步')}},
  subscribe:fn=>{changeListeners.push(fn);return()=>{changeListeners=changeListeners.filter(x=>x!==fn)}},
  setCloudStatus:(text,online=false)=>{$('#syncStatus').textContent=(online?'● ':'○ ')+text;$('#syncStatus').style.color=online?'#5f825b':''},
  showToast
};
renderAll();renderEssentials();updateStatus();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
