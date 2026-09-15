
const STORE_KEY='vibeos-v1-state';
const defaultState=()=>({
  mode:'Normal',
  workspaces:[
    {id:crypto.randomUUID(),title:'DMS Today',kind:'day',status:'active',summary:'Focus on the next useful business action.',items:['Review priority work','Capture decisions','Close one loop']},
    {id:crypto.randomUUID(),title:'GovBidPro Prep',kind:'meeting',status:'active',summary:'Meeting preparation workspace.',items:['Purpose: clarify fit and next steps','Questions: pricing, scope, implementation','Pitch: DMS helps small businesses simplify technology and operations']},
    {id:crypto.randomUUID(),title:'Device',kind:'device',status:'active',summary:'Android device capability workspace.',items:['Offline app shell ready','Notification context available in native build','Foreground app context available in native build','Android settings shortcuts available','File import available']}
  ],
  memories:[
    {id:crypto.randomUUID(),type:'project',title:'VibeOS',body:'Local-first generative Android shell.',pinned:true,location:'Local'},
    {id:crypto.randomUUID(),type:'preference',title:'No-code UX',body:'Do not expose implementation syntax in the primary user experience.',pinned:true,location:'Local'}
  ],
  flows:[
    {id:crypto.randomUUID(),name:'Morning brief',enabled:true,text:'Every morning, show what actually matters.',parts:{trigger:'Morning',context:'Workspaces + memory',reason:'Prioritize',generate:'Daily plan',present:'Vibe home',remember:'Completed or deferred items'}},
    {id:crypto.randomUUID(),name:'Pre-meeting prep',enabled:true,text:'Prepare me 30 minutes before meetings.',parts:{trigger:'Before meeting',context:'Meeting + project memory',reason:'Prepare',generate:'Meeting workspace',present:'Vibe home',remember:'Decisions + follow-ups'}},
    {id:crypto.randomUUID(),name:'Critical message',enabled:false,text:'When a critical message arrives, surface it here.',parts:{trigger:'Incoming critical message',context:'Connector needed',reason:'Reduce missed urgency',generate:'Alert workspace',present:'Vibe home',remember:'Outcome'}}
  ],
  activity:[{id:crypto.randomUUID(),time:new Date().toISOString(),text:'VibeOS initialized.'}]
});
let state;
try{state=JSON.parse(localStorage.getItem(STORE_KEY))||defaultState()}catch{state=defaultState()}
const save=()=>localStorage.setItem(STORE_KEY,JSON.stringify(state));
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const log=t=>{state.activity.unshift({id:crypto.randomUUID(),time:new Date().toISOString(),text:t});state.activity=state.activity.slice(0,100);save();renderActivity()};

const nativeBridge=()=>typeof window.VibeAndroid!=='undefined';
function nativeJson(method,fallback){
  try{return JSON.parse(window.VibeAndroid[method]())}catch{return fallback}
}
function callNative(method,...args){
  if(!nativeBridge()||typeof window.VibeAndroid[method]!=='function')return false;
  try{window.VibeAndroid[method](...args);return true}catch{return false}
}

function applyMode(){
  document.body.className='';
  if(state.mode!=='Normal') document.body.classList.add('mode-'+state.mode.replaceAll(' ','-'));
  $('#modeBtn').textContent='Mode: '+state.mode;
  $('#modeSelect').value=state.mode;
}
function navTo(id){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+id).classList.add('active');
  $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
}
function renderWorkspaces(){
  const box=$('#workspaceList');box.innerHTML='';
  state.workspaces.filter(w=>w.status!=='archived').forEach(w=>{
    const el=document.createElement('article');el.className='card workspace';
    el.innerHTML=`<h3>${esc(w.title)}</h3><div class="meta">${esc(w.kind)} · ${esc(w.status)}</div><p>${esc(w.summary)}</p>
      <div class="actions"><button data-open>Open</button><button data-complete>${w.status==='done'?'Reopen':'Complete'}</button><button data-archive>Archive</button></div>`;
    el.querySelector('[data-open]').addEventListener('click',()=>openWorkspace(w.id));
    el.querySelector('[data-complete]').addEventListener('click',()=>{w.status=w.status==='done'?'active':'done';save();renderWorkspaces();});
    el.querySelector('[data-archive]').addEventListener('click',()=>{w.status='archived';save();renderWorkspaces();});
    box.appendChild(el);
  });
}
function openWorkspace(id){
  const w=state.workspaces.find(x=>x.id===id); if(!w)return;
  let extra='';
  if(w.kind==='device'){
    const device=nativeBridge()?nativeJson('getDeviceInfo',{}):{};
    const caps=nativeBridge()?nativeJson('getCapabilities',{}):{};
    const current=nativeBridge()?String(window.VibeAndroid.getCurrentAppContext()||''):'';
    extra=`<div class="card" style="margin-top:12px"><h3>Native Android bridge</h3><p class="meta">${nativeBridge()?'Connected':'Not active in browser/PWA mode'}</p>
      ${nativeBridge()?`<p>${esc([device.manufacturer,device.model].filter(Boolean).join(' '))} · Android ${esc(device.androidVersion||'')} · SDK ${esc(device.sdk||'')}</p>
      <p class="meta">Foreground context: ${esc(current||'No context captured yet')}</p>
      <div class="actions"><button type="button" id="notifSettings">Notification access</button><button type="button" id="accessSettings">Accessibility context</button><button type="button" id="batterySettings">Battery settings</button><button type="button" id="appSettings">App settings</button><button type="button" id="readNotifs">Recent notifications</button><button type="button" id="testVoice">Speak status</button><button type="button" id="testBuzz">Vibrate</button></div>`:`<p>Install the APK build for native notification context, accessibility context, Android settings shortcuts, sharing, vibration and text-to-speech.</p>`}
    </div>`;
  }
  showDialog(`<h2>${esc(w.title)}</h2><p>${esc(w.summary)}</p><ul>${w.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>${extra}
    <label>Edit title<input id="wsTitle" value="${attr(w.title)}"></label>
    <label>Summary<textarea id="wsSummary">${esc(w.summary)}</textarea></label>
    <div class="actions"><button type="button" id="saveWs">Save</button>${nativeBridge()?'<button type="button" id="shareWs">Share</button>':''}</div>`);
  $('#saveWs').addEventListener('click',()=>{w.title=$('#wsTitle').value.trim()||w.title;w.summary=$('#wsSummary').value.trim();save();renderWorkspaces();$('#dialog').close();});
  if(nativeBridge()){
    $('#shareWs')?.addEventListener('click',()=>callNative('shareText',`${w.title}\n\n${w.summary}\n\n${w.items.join('\n')}`));
    $('#notifSettings')?.addEventListener('click',()=>callNative('openNotificationAccessSettings'));
    $('#accessSettings')?.addEventListener('click',()=>callNative('openAccessibilitySettings'));
    $('#batterySettings')?.addEventListener('click',()=>callNative('openBatterySettings'));
    $('#appSettings')?.addEventListener('click',()=>callNative('openAppSettings'));
    $('#testVoice')?.addEventListener('click',()=>callNative('speak','VibeOS native bridge is active.'));
    $('#testBuzz')?.addEventListener('click',()=>callNative('vibrate',120));
    $('#readNotifs')?.addEventListener('click',()=>{
      const rows=nativeJson('getRecentNotifications',[]);
      const body=Array.isArray(rows)&&rows.length?rows.map(n=>`<li><b>${esc(n.title||n.package||'Notification')}</b><br>${esc(n.text||'')}<div class="meta">${esc(n.package||'')}</div></li>`).join(''):'<li>No captured notifications yet. Grant notification access first.</li>';
      showDialog(`<h2>Recent notifications</h2><ul>${body}</ul>`);
    });
  }
}
function renderMemories(){
  const q=$('#memorySearch').value.toLowerCase(),f=$('#memoryFilter').value,box=$('#memoryList');box.innerHTML='';
  state.memories.filter(m=>(f==='all'||m.type===f)&&(`${m.title} ${m.body}`.toLowerCase().includes(q))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)).forEach(m=>{
    const el=document.createElement('article');el.className='card memoryItem';
    el.innerHTML=`<h3>${m.pinned?'📌 ':''}${esc(m.title)}</h3><div class="meta">${esc(m.type)} · ${esc(m.location)}</div><p>${esc(m.body)}</p>
      <div class="actions"><button data-pin>${m.pinned?'Unpin':'Pin'}</button><button data-edit>Edit</button><button data-del>Delete</button></div>`;
    el.querySelector('[data-pin]').onclick=()=>{m.pinned=!m.pinned;save();renderMemories()};
    el.querySelector('[data-edit]').onclick=()=>editMemory(m.id);
    el.querySelector('[data-del]').onclick=()=>{if(confirm('Delete this memory?')){state.memories=state.memories.filter(x=>x.id!==m.id);save();renderMemories()}};
    box.appendChild(el);
  });
}
function editMemory(id){
  let m=id?state.memories.find(x=>x.id===id):{id:crypto.randomUUID(),type:'project',title:'',body:'',pinned:false,location:'Local'};
  showDialog(`<h2>${id?'Edit':'Add'} memory</h2>
    <label>Type<select id="mType">${['project','person','decision','preference','unfinished'].map(x=>`<option ${m.type===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>Title<input id="mTitle" value="${attr(m.title)}"></label>
    <label>Body<textarea id="mBody">${esc(m.body)}</textarea></label>
    <div class="actions"><button type="button" id="saveM">Save</button></div>`);
  $('#saveM').onclick=()=>{m.type=$('#mType').value;m.title=$('#mTitle').value.trim()||'Untitled';m.body=$('#mBody').value.trim();if(!id)state.memories.push(m);save();renderMemories();$('#dialog').close()};
}
function renderFlows(){
  const box=$('#flowList');box.innerHTML='';
  state.flows.forEach(f=>{
    const el=document.createElement('article');el.className='card flowItem';
    el.innerHTML=`<h3>${esc(f.name)}</h3><p>${esc(f.text)}</p><div class="meta">${f.enabled?'Enabled':'Disabled'}</div>
      <div class="actions"><button data-run>Run now</button><button data-toggle>${f.enabled?'Disable':'Enable'}</button><button data-edit>Edit</button><button data-del>Delete</button></div>`;
    el.querySelector('[data-run]').onclick=()=>runFlow(f);
    el.querySelector('[data-toggle]').onclick=()=>{f.enabled=!f.enabled;save();renderFlows()};
    el.querySelector('[data-edit]').onclick=()=>editFlow(f.id);
    el.querySelector('[data-del]').onclick=()=>{if(confirm('Delete this flow?')){state.flows=state.flows.filter(x=>x.id!==f.id);save();renderFlows()}};
    box.appendChild(el);
  });
}
function editFlow(id){
  let f=id?state.flows.find(x=>x.id===id):{id:crypto.randomUUID(),name:'',enabled:true,text:'',parts:{trigger:'Manual',context:'VibeOS state',reason:'User intent',generate:'Workspace/action',present:'VibeOS',remember:'Result'}};
  showDialog(`<h2>${id?'Edit':'Create'} flow</h2><label>Name<input id="fName" value="${attr(f.name)}"></label><label>Describe the automation<textarea id="fText">${esc(f.text)}</textarea></label>
  <div class="actions"><button type="button" id="saveF">Save</button></div>`);
  $('#saveF').onclick=()=>{f.name=$('#fName').value.trim()||'Untitled flow';f.text=$('#fText').value.trim();f.parts=normalizeFlow(f.text);if(!id)state.flows.push(f);save();renderFlows();$('#dialog').close()};
}
function normalizeFlow(text){
  let trigger='Manual'; const t=text.toLowerCase();
  if(t.includes('morning'))trigger='Morning';
  else if(t.includes('before'))trigger='Before event';
  else if(t.includes('when'))trigger='When condition occurs';
  return {trigger,context:'Relevant VibeOS memory/workspaces',reason:'Fulfill stated intent',generate:'Contextual action or workspace',present:'VibeOS shell',remember:'Outcome and follow-up'};
}
function runFlow(f){
  const w={id:crypto.randomUUID(),title:f.name,kind:'flow-result',status:'active',summary:'Generated by Flow: '+f.text,items:Object.entries(f.parts).map(([k,v])=>`${k}: ${v}`)};
  state.workspaces.unshift(w);save();renderWorkspaces();log(`Ran flow: ${f.name}`);navTo('vibeView');
}
function generateWorkspace(intent){
  const t=intent.trim(); if(!t)return;
  const low=t.toLowerCase(); let w;
  if(low.includes('meeting')||low.includes('govbid')){
    w={id:crypto.randomUUID(),title:t.replace(/^prepare me for /i,'').replace(/\.$/,'')||'Meeting prep',kind:'meeting',status:'active',summary:'Generated meeting preparation workspace.',items:['Purpose: define the desired outcome','Agenda: opening, discovery, decisions, next steps','Questions: scope, pricing, implementation, risks','Pitch: Dot Matrix Solutions simplifies technology and process flow for small businesses','START MEETING']};
  }else if(low.includes('today')||low.includes('plan')){
    w={id:crypto.randomUUID(),title:'Today',kind:'day',status:'active',summary:'Generated focus plan.',items:['NOW: choose the highest-value action','NEXT: close one open loop','LATER: defer nonessential work']};
  }else if(low.includes('device')||low.includes('phone')){
    w={id:crypto.randomUUID(),title:'Device',kind:'device',status:'active',summary:'Android capability workspace.',items:nativeBridge()?['Native shell active','Notification context available after permission','Accessibility context available after permission','Android settings shortcuts available','Offline assets active']:['Installable PWA available','Offline shell supported','Install APK for notification context','Install APK for accessibility context','Install APK for Android settings integration']};
  }else if(low.includes('note')||low.includes('remember')){
    state.memories.push({id:crypto.randomUUID(),type:'unfinished',title:'Captured note',body:t,pinned:false,location:'Local'});save();renderMemories();log('Captured memory: '+t);return;
  }else if(low.includes('flow')||low.includes('every')){
    const f={id:crypto.randomUUID(),name:'Generated flow',enabled:true,text:t,parts:normalizeFlow(t)};state.flows.unshift(f);save();renderFlows();log('Created flow: '+t);return;
  }else{
    w={id:crypto.randomUUID(),title:'Generated workspace',kind:'general',status:'active',summary:t,items:['Clarify desired result','Gather relevant context','Choose next action','Record outcome']};
  }
  state.workspaces.unshift(w);save();renderWorkspaces();log('Generated workspace: '+w.title);
}
function runAyla(cmd){
  const t=cmd.trim();if(!t)return;const low=t.toLowerCase();
  if(low.includes('adhd')){state.mode='ADHD';}
  else if(low.includes('fine motor')){state.mode='Fine Motor';}
  else if(low.includes('low stimulation')){state.mode='Low Stimulation';}
  else if(low.includes('high contrast')){state.mode='High Contrast';}
  else if(low.includes('normal mode')){state.mode='Normal';}
  else if(low.startsWith('remember ')){state.memories.push({id:crypto.randomUUID(),type:'preference',title:'Ayla memory',body:t.slice(9),pinned:false,location:'Local'});}
  else if(low.startsWith('create flow ')){state.flows.unshift({id:crypto.randomUUID(),name:'Ayla flow',enabled:true,text:t.slice(12),parts:normalizeFlow(t.slice(12))});}
  else if(low.includes('search memory')){navTo('memoryView');$('#memorySearch').value=t.replace(/.*search memory/i,'').trim();renderMemories();log('Ayla searched memory.');return;}
  else{generateWorkspace(t);$('#aylaInput').value='';return;}
  save();applyMode();renderAll();log('Ayla: '+t);$('#aylaInput').value='';
}
function renderActivity(){
  const box=$('#activityList');box.innerHTML='';
  state.activity.forEach(a=>{const el=document.createElement('div');el.className='card';el.innerHTML=`<div>${esc(a.text)}</div><div class="meta">${new Date(a.time).toLocaleString()}</div>`;box.appendChild(el);});
}
function renderAll(){applyMode();renderWorkspaces();renderMemories();renderFlows();renderActivity();}
function showDialog(html){$('#dialogBody').innerHTML=html;$('#dialog').showModal();}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function attr(s=''){return esc(s).replace(/"/g,'&quot;')}

$$('.nav button').forEach(b=>b.onclick=()=>navTo(b.dataset.view));
$('#runIntent').onclick=()=>{generateWorkspace($('#intentInput').value);$('#intentStatus').textContent='Workspace generated locally.';$('#intentInput').value='';};
$('#addMemoryBtn').onclick=()=>editMemory();
$('#memorySearch').oninput=renderMemories;$('#memoryFilter').onchange=renderMemories;
$('#addFlowBtn').onclick=()=>editFlow();
$('#aylaRun').onclick=()=>runAyla($('#aylaInput').value);
$('#modeBtn').onclick=()=>navTo('settingsView');
$('#modeSelect').onchange=e=>{state.mode=e.target.value;save();applyMode();renderAll()};
$('#betterBtn').onclick=()=>showDialog(`<h2>Make it better</h2><p>Contextual improvements:</p><ul><li>Simplify the current screen</li><li>Turn repeated actions into a Flow</li><li>Pin important memory</li><li>Switch accessibility mode</li></ul>`);
$('#exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vibeos-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$('#importInput').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());state=parsed;save();renderAll();alert('VibeOS data imported.');}
  catch{alert('That file is not valid VibeOS JSON.');}
};
$('#resetBtn').onclick=()=>{if(confirm('Reset all local VibeOS data?')){state=defaultState();save();renderAll();}};
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
$('#installBtn').onclick=async()=>{
  if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;}
  else showDialog(`<h2>Install VibeOS on Android</h2><ol><li>Open VibeOS in Chrome.</li><li>Tap the three-dot menu.</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm.</li></ol><p>If those options do not appear, serve VibeOS over HTTPS or localhost first.</p>`);
};
if('serviceWorker' in navigator && location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
if(nativeBridge()){$('#installBtn').textContent='Native app installed';$('#installBtn').disabled=true;}
renderAll();
