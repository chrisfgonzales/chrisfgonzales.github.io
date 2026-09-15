const LEGACY_KEY = 'vibeos-v1-state';
const DB_NAME = 'vibeos';
const DB_VERSION = 1;
const STORES = ['workspaces', 'memories', 'flows', 'activity', 'settings'];
const $ = selector => document.querySelector(selector);
const id = () => crypto.randomUUID();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const when = value => new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
const routeNames = { home:['⌂','Home'], workspaces:['▣','Workspaces'], memory:['◈','Memory'], flows:['↺','Flows'], settings:['⚙','Settings'] };
let db, route = 'home', deferredInstall, updateReady = false;
let state = { workspaces:[], memories:[], flows:[], activity:[], settings:{ theme:'system', motion:'system', initialized:false, installDismissed:false } };

function defaultRecords() {
  return {
    workspaces:[
      { id:id(), title:'DMS Today', kind:'Focus', status:'active', summary:'Focus on the next useful business action.', items:[{id:id(),text:'Review priority work',done:false},{id:id(),text:'Capture decisions',done:false},{id:id(),text:'Close one loop',done:false}], createdAt:Date.now(), updatedAt:Date.now() },
      { id:id(), title:'GovBidPro Prep', kind:'Meeting', status:'active', summary:'Prepare the conversation and capture the next step.', items:[{id:id(),text:'Clarify fit and outcome',done:false},{id:id(),text:'Confirm scope and implementation questions',done:false}], createdAt:Date.now(), updatedAt:Date.now() }
    ],
    memories:[{ id:id(), type:'preference', title:'No-code UX', body:'Do not expose implementation syntax in the primary user experience.', pinned:true, createdAt:Date.now(), updatedAt:Date.now() }],
    flows:[{ id:id(), name:'Morning brief', enabled:true, text:'Create a focused daily plan from my active workspaces.', createdAt:Date.now(), updatedAt:Date.now() }],
    activity:[]
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => STORES.forEach(name => request.result.objectStoreNames.contains(name) || request.result.createObjectStore(name, { keyPath:'id' }));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function readAll(store) {
  return new Promise((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
function put(store, record) {
  return new Promise((resolve, reject) => { const request = db.transaction(store, 'readwrite').objectStore(store).put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
function remove(store, recordId) {
  return new Promise((resolve, reject) => { const request = db.transaction(store, 'readwrite').objectStore(store).delete(recordId); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
async function resetDb() {
  await Promise.all(STORES.map(store => new Promise((resolve, reject) => { const request = db.transaction(store, 'readwrite').objectStore(store).clear(); request.onsuccess = resolve; request.onerror = () => reject(request.error); })));
}
async function loadState() {
  const settingRows = await readAll('settings');
  state.settings = settingRows.find(row => row.id === 'preferences') || state.settings;
  for (const store of ['workspaces','memories','flows','activity']) state[store] = await readAll(store);
  if (!state.settings.initialized) {
    const legacy = localStorage.getItem(LEGACY_KEY);
    let migrated = false;
    if (legacy) {
      try {
        const old = JSON.parse(legacy);
        for (const name of ['workspaces','memories','flows','activity']) for (const item of (Array.isArray(old[name]) ? old[name] : [])) await put(name, normalize(name, item));
        state.settings = { ...state.settings, theme:old.mode === 'High Contrast' ? 'contrast' : 'system', initialized:true, migration:'v1' };
        migrated = true;
      } catch (error) { toast('Existing local data could not be migrated. Your original data was not deleted.'); }
    }
    if (!migrated) {
      const defaults = defaultRecords();
      for (const name of ['workspaces','memories','flows','activity']) for (const item of defaults[name]) await put(name, item);
      state.settings = { ...state.settings, initialized:true };
    }
    await put('settings', state.settings);
    await loadState();
  }
}
function normalize(store, item) {
  const now = Date.now();
  if (store === 'workspaces') return { id:item.id || id(), title:item.title || 'Untitled workspace', kind:item.kind || 'General', status:item.status || 'active', summary:item.summary || '', items:(item.items || []).map(text => typeof text === 'string' ? {id:id(),text,done:false} : {id:text.id || id(),text:text.text || '',done:!!text.done}), createdAt:item.createdAt || now, updatedAt:now };
  if (store === 'memories') return { id:item.id || id(), type:item.type || 'note', title:item.title || 'Untitled memory', body:item.body || '', pinned:!!item.pinned, createdAt:item.createdAt || now, updatedAt:now };
  if (store === 'flows') return { id:item.id || id(), name:item.name || 'Untitled flow', text:item.text || '', enabled:item.enabled !== false, createdAt:item.createdAt || now, updatedAt:now };
  return { id:item.id || id(), text:item.text || 'Imported activity', time:item.time || new Date().toISOString() };
}
async function saveRecord(store, record) { await put(store, record); state[store] = await readAll(store); render(); }
async function activity(text) { const record = { id:id(), text, time:new Date().toISOString() }; await put('activity', record); state.activity = [record, ...state.activity].slice(0, 100); if (state.activity.length === 101) await remove('activity', state.activity.at(-1).id); }
async function saveSettings(next) { state.settings = { ...state.settings, ...next, id:'preferences' }; await put('settings', state.settings); applyPreferences(); render(); }

function applyPreferences() {
  const theme = state.settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : state.settings.theme;
  document.documentElement.dataset.theme = theme === 'dark' ? '' : theme;
  document.documentElement.dataset.motion = state.settings.motion === 'reduce' ? 'reduce' : '';
  $('meta[name="theme-color"]').content = theme === 'light' ? '#f8f9ff' : '#101827';
}
function nativeBridge() { return typeof window.VibeAndroid !== 'undefined'; }
function nativeValue(method, fallback) { try { return JSON.parse(window.VibeAndroid[method]()); } catch (error) { console.error(`VibeAndroid.${method} failed`, error); return fallback; } }
function callNative(method, ...args) { if (!nativeBridge() || typeof window.VibeAndroid[method] !== 'function') return false; try { window.VibeAndroid[method](...args); return true; } catch (error) { console.error(`VibeAndroid.${method} failed`, error); toast('That Android feature is unavailable right now.'); return false; } }

function nav() { return Object.entries(routeNames).map(([key,[icon,label]]) => `<button class="nav-button" data-route="${key}" ${route === key ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join(''); }
function header(title, copy, action='') { return `<header class="view-header"><div><h1>${title}</h1><p class="lede">${copy}</p></div>${action}</header>`; }
function workspaceCard(workspace) {
  const complete = workspace.items.filter(item => item.done).length;
  return `<article class="card workspace"><div class="status-row"><span class="badge ${esc(workspace.status)}">${esc(workspace.status)}</span><span>${complete}/${workspace.items.length} complete</span></div><h3>${esc(workspace.title)}</h3><p>${esc(workspace.summary)}</p><div class="button-row"><button data-open-workspace="${workspace.id}">Open</button><button data-toggle-workspace="${workspace.id}">${workspace.status === 'done' ? 'Reopen' : 'Complete'}</button></div></article>`;
}
function homeView() {
  const active = state.workspaces.filter(item => item.status === 'active').sort((a,b) => b.updatedAt-a.updatedAt);
  const focus = active[0];
  return `${header('Make the next useful thing easy.', 'A private space for focus, memory, and routines.')}<section class="card hero"><label for="intent">What do you need to make progress on?</label><textarea id="intent" placeholder="Prepare me for tomorrow’s meeting."></textarea><div class="button-row"><button id="createIntent" class="primary">Create workspace</button><button id="captureIntent">Save as memory</button></div></section><section class="split section"><div><div class="section-heading"><h2>Active work</h2><button data-route="workspaces">View all</button></div><div class="grid">${active.slice(0,4).map(workspaceCard).join('') || empty('No active workspaces yet.', 'Create a workspace to start.')}</div></div><aside class="card"><h2>Today’s focus</h2>${focus ? `<h3>${esc(focus.title)}</h3><p class="muted">${esc(focus.items.find(item => !item.done)?.text || 'Everything here is complete.')}</p><button data-open-workspace="${focus.id}">Open focus</button>` : '<p class="muted">Choose an active workspace to establish your focus.</p>'}</aside></section>${updateReady ? `<section class="card section"><strong>A VibeOS update is ready.</strong><p class="muted">Reload when you’re ready to use the latest offline shell.</p><button id="reloadUpdate">Reload update</button></section>` : ''}`;
}
function workspacesView() { return `${header('Workspaces','Keep each meaningful outcome in one focused place.','<button id="newWorkspace" class="primary">New workspace</button>')}<div class="grid">${state.workspaces.sort((a,b)=>b.updatedAt-a.updatedAt).map(workspaceCard).join('') || empty('No workspaces yet.','Create a workspace to start.')}</div>`; }
function memoryView() { const memories = state.memories.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt); return `${header('Memory','Notes and preferences saved only on this device.','<button id="newMemory" class="primary">Add memory</button>')}<div class="card section"><label class="field"><span>Search memory</span><input id="memorySearch" type="search" placeholder="Search titles and notes"></label></div><div id="memoryResults" class="list section">${memoryList(memories)}</div>`; }
function memoryList(items) { return items.map(memory => `<article class="card list-item"><div><span class="badge">${esc(memory.type)}</span><h3>${memory.pinned ? 'Pinned · ' : ''}${esc(memory.title)}</h3><p>${esc(memory.body)}</p></div><div class="button-row"><button data-edit-memory="${memory.id}">Edit</button><button data-delete-memory="${memory.id}" class="danger">Delete</button></div></article>`).join('') || empty('No matching memory.','Try a different search or add a memory.'); }
function flowsView() { return `${header('Flows','Reusable local routines you run when they help.','<button id="newFlow" class="primary">Create flow</button>')}<div class="list">${state.flows.map(flow => `<article class="card list-item"><div><span class="badge ${flow.enabled ? 'active' : ''}">${flow.enabled ? 'Ready to run' : 'Paused'}</span><h3>${esc(flow.name)}</h3><p>${esc(flow.text)}</p></div><div class="button-row"><button data-run-flow="${flow.id}" ${flow.enabled ? '' : 'disabled'}>Run</button><button data-edit-flow="${flow.id}">Edit</button></div></article>`).join('') || empty('No flows yet.','Create one for a routine you repeat.')}</div><p class="muted section">Flows run only when you choose them. Calendar, notification, and cloud-triggered automation are not enabled in this local-first release.</p>`; }
function settingsView() { const isNative = nativeBridge(); return `${header('Settings','Control VibeOS, your local data, and device permissions.')}<div class="settings-grid"><section class="card"><h2>Appearance</h2><label class="field"><span>Theme</span><select id="themeSelect">${['system','light','dark','contrast'].map(value => `<option value="${value}" ${state.settings.theme===value?'selected':''}>${value[0].toUpperCase()+value.slice(1)}</option>`).join('')}</select></label><label class="field"><span>Motion</span><select id="motionSelect"><option value="system" ${state.settings.motion==='system'?'selected':''}>Follow system preference</option><option value="reduce" ${state.settings.motion==='reduce'?'selected':''}>Reduce motion</option></select></label></section><section class="card"><h2>Your data</h2><p class="muted">Workspaces, memory, and flows are stored locally in this browser or app profile.</p><div class="button-row"><button id="exportData">Export data</button><label class="file-button">Import data<input id="importData" type="file" accept="application/json"></label><button id="resetData" class="danger">Reset local data</button></div></section><section class="card native-status"><h2>Device capabilities</h2><p class="muted">${isNative ? 'Native Android shell detected. Settings open only when you request them.' : 'Browser/PWA mode. Native Android capabilities are unavailable here.'}</p>${isNative ? '<div class="button-row"><button data-native="openNotificationAccessSettings">Notification access</button><button data-native="openAccessibilitySettings">Accessibility context</button><button data-native="openAppSettings">App settings</button><button id="nativeDetails">Capability details</button></div>' : '<p>Install the APK for optional Android notification context, accessibility context, sharing, text-to-speech, and haptics.</p>'}</section><section class="card"><h2>Privacy Center</h2><p class="muted">VibeOS does not have an account, cloud sync, analytics, or live connectors. Exporting or sharing data happens only when you choose it.</p><button id="privacyDetails">Read privacy details</button></section></div>`; }
function empty(title, copy) { return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`; }

function render() {
  applyPreferences(); $('#sideNav').innerHTML = nav(); $('#bottomNav').innerHTML = nav();
  const views = {home:homeView,workspaces:workspacesView,memory:memoryView,flows:flowsView,settings:settingsView};
  $('#main').innerHTML = views[route]();
  $('#connectionStatus').textContent = navigator.onLine ? 'Saved on this device' : 'Offline — changes stay on this device';
  bind();
}
function go(next) { route = next; location.hash = next; render(); $('#main').focus(); }
function toast(text) { const node = $('#toastTemplate').content.firstElementChild.cloneNode(true); node.textContent = text; document.body.append(node); setTimeout(() => node.remove(), 3500); }
function dialog(title, body) { $('#dialogBody').innerHTML = `<h2 id="dialogTitle">${title}</h2>${body}`; $('#dialog').showModal(); }
function workspaceDialog(workspace) {
  const draft = workspace || { id:id(), title:'', kind:'General', status:'active', summary:'', items:[], createdAt:Date.now(), updatedAt:Date.now() };
  dialog(workspace ? esc(draft.title) : 'New workspace', `<label class="field"><span>Title</span><input id="wsTitle" value="${esc(draft.title)}"></label><label class="field"><span>Purpose</span><textarea id="wsSummary">${esc(draft.summary)}</textarea></label><label class="field"><span>Next actions (one per line)</span><textarea id="wsItems">${esc(draft.items.map(item=>item.text).join('\n'))}</textarea></label><div class="button-row"><button id="saveWorkspace" class="primary">Save workspace</button>${workspace ? '<button id="shareWorkspace">Share</button>' : ''}</div>`);
  $('#saveWorkspace').onclick = async () => { draft.title=$('#wsTitle').value.trim() || 'Untitled workspace'; draft.summary=$('#wsSummary').value.trim(); draft.items=$('#wsItems').value.split('\n').map(text=>text.trim()).filter(Boolean).map((text,index)=>({id:draft.items[index]?.id || id(),text,done:draft.items[index]?.done || false})); draft.updatedAt=Date.now(); await saveRecord('workspaces',draft); await activity(`Saved workspace: ${draft.title}`); $('#dialog').close(); toast('Workspace saved locally.'); };
  $('#shareWorkspace')?.addEventListener('click', () => { const text=`${draft.title}\n\n${draft.summary}\n\n${draft.items.map(item=>`${item.done?'✓':'○'} ${item.text}`).join('\n')}`; nativeBridge() ? callNative('shareText',text) : navigator.share?.({title:draft.title,text}).catch(error=>{ if (error.name !== 'AbortError') toast('Sharing is unavailable in this browser.'); }); });
}
function bind() {
  document.querySelectorAll('[data-route]').forEach(button => button.onclick = () => go(button.dataset.route));
  $('#quickAction').onclick = () => workspaceDialog();
  $('#themeBtn').onclick = () => go('settings');
  $('#createIntent')?.addEventListener('click', async () => { const text=$('#intent').value.trim(); if (!text) return toast('Describe what you want to make progress on.'); const workspace={id:id(),title:text.replace(/^prepare (me )?for /i,'').replace(/[.?!]$/,''),kind:'Focus',status:'active',summary:text,items:[{id:id(),text:'Clarify the desired outcome',done:false},{id:id(),text:'Choose the next useful action',done:false}],createdAt:Date.now(),updatedAt:Date.now()}; await saveRecord('workspaces',workspace); await activity(`Created workspace: ${workspace.title}`); $('#intent').value=''; toast('Workspace created locally.'); });
  $('#captureIntent')?.addEventListener('click', async () => { const text=$('#intent').value.trim(); if (!text) return toast('Enter something to save.'); await saveRecord('memories',{id:id(),type:'note',title:'Quick capture',body:text,pinned:false,createdAt:Date.now(),updatedAt:Date.now()}); await activity('Saved a quick memory.'); $('#intent').value=''; toast('Memory saved locally.'); });
  $('#newWorkspace')?.addEventListener('click',()=>workspaceDialog());
  document.querySelectorAll('[data-open-workspace]').forEach(button => button.onclick=()=>workspaceDialog(state.workspaces.find(item=>item.id===button.dataset.openWorkspace)));
  document.querySelectorAll('[data-toggle-workspace]').forEach(button => button.onclick=async()=>{const item=state.workspaces.find(workspace=>workspace.id===button.dataset.toggleWorkspace);item.status=item.status==='done'?'active':'done';item.updatedAt=Date.now();await saveRecord('workspaces',item);await activity(`${item.status==='done'?'Completed':'Reopened'} workspace: ${item.title}`);});
  $('#newMemory')?.addEventListener('click',()=>memoryDialog());
  $('#memorySearch')?.addEventListener('input',event=>$('#memoryResults').innerHTML=memoryList(state.memories.filter(item=>`${item.title} ${item.body}`.toLowerCase().includes(event.target.value.toLowerCase()))));
  document.querySelectorAll('[data-edit-memory]').forEach(button=>button.onclick=()=>memoryDialog(state.memories.find(item=>item.id===button.dataset.editMemory)));
  document.querySelectorAll('[data-delete-memory]').forEach(button=>button.onclick=async()=>{const item=state.memories.find(memory=>memory.id===button.dataset.deleteMemory);if (!confirm(`Delete "${item.title}" from local memory?`)) return;await remove('memories',item.id);state.memories=await readAll('memories');await activity(`Deleted memory: ${item.title}`);render();});
  $('#newFlow')?.addEventListener('click',()=>flowDialog());
  document.querySelectorAll('[data-edit-flow]').forEach(button=>button.onclick=()=>flowDialog(state.flows.find(item=>item.id===button.dataset.editFlow)));
  document.querySelectorAll('[data-run-flow]').forEach(button=>button.onclick=async()=>{const flow=state.flows.find(item=>item.id===button.dataset.runFlow);const workspace={id:id(),title:flow.name,kind:'Flow result',status:'active',summary:flow.text,items:[{id:id(),text:'Review the intended outcome',done:false},{id:id(),text:'Complete the next useful action',done:false}],createdAt:Date.now(),updatedAt:Date.now()};await saveRecord('workspaces',workspace);await activity(`Ran flow: ${flow.name}`);go('workspaces');toast('Flow created a local workspace.');});
  $('#themeSelect')?.addEventListener('change',event=>saveSettings({theme:event.target.value})); $('#motionSelect')?.addEventListener('change',event=>saveSettings({motion:event.target.value}));
  $('#exportData')?.addEventListener('click', exportData); $('#importData')?.addEventListener('change', importData); $('#resetData')?.addEventListener('click', resetData); $('#privacyDetails')?.addEventListener('click',()=>dialog('Privacy Center','<p>VibeOS stores its core data only in this app or browser profile. It has no account, cloud sync, analytics, or live connectors.</p><p>Export and share actions are initiated by you. In the Android APK, notification context and the foreground app package are optional system-granted features stored locally by the app.</p>')); $('#nativeDetails')?.addEventListener('click',()=>dialog('Android capability details',`<p>${esc(JSON.stringify(nativeValue('getCapabilities',{}),null,2))}</p>`)); document.querySelectorAll('[data-native]').forEach(button=>button.onclick=()=>callNative(button.dataset.native));
  $('#installBtn').onclick=install;
  $('#reloadUpdate')?.addEventListener('click',()=>location.reload());
}
function memoryDialog(memory) { const draft=memory || {id:id(),type:'note',title:'',body:'',pinned:false,createdAt:Date.now(),updatedAt:Date.now()}; dialog(memory?'Edit memory':'Add memory',`<label class="field"><span>Type</span><select id="memoryType">${['note','project','person','decision','preference'].map(type=>`<option ${draft.type===type?'selected':''}>${type}</option>`).join('')}</select></label><label class="field"><span>Title</span><input id="memoryTitle" value="${esc(draft.title)}"></label><label class="field"><span>Note</span><textarea id="memoryBody">${esc(draft.body)}</textarea></label><label><input id="memoryPinned" type="checkbox" ${draft.pinned?'checked':''}> Pin this memory</label><div class="button-row"><button id="saveMemory" class="primary">Save memory</button></div>`); $('#saveMemory').onclick=async()=>{draft.type=$('#memoryType').value;draft.title=$('#memoryTitle').value.trim()||'Untitled memory';draft.body=$('#memoryBody').value.trim();draft.pinned=$('#memoryPinned').checked;draft.updatedAt=Date.now();await saveRecord('memories',draft);await activity(`Saved memory: ${draft.title}`);$('#dialog').close();toast('Memory saved locally.');}; }
function flowDialog(flow) { const draft=flow || {id:id(),name:'',text:'',enabled:true,createdAt:Date.now(),updatedAt:Date.now()}; dialog(flow?'Edit flow':'Create flow',`<label class="field"><span>Flow name</span><input id="flowName" value="${esc(draft.name)}"></label><label class="field"><span>What should this routine do?</span><textarea id="flowText">${esc(draft.text)}</textarea></label><label><input id="flowEnabled" type="checkbox" ${draft.enabled?'checked':''}> Ready to run</label><div class="button-row"><button id="saveFlow" class="primary">Save flow</button></div>`); $('#saveFlow').onclick=async()=>{draft.name=$('#flowName').value.trim()||'Untitled flow';draft.text=$('#flowText').value.trim()||'Create a focused workspace.';draft.enabled=$('#flowEnabled').checked;draft.updatedAt=Date.now();await saveRecord('flows',draft);await activity(`Saved flow: ${draft.name}`);$('#dialog').close();toast('Flow saved locally.');}; }
function exportData() { const data={schemaVersion:2,exportedAt:new Date().toISOString(),workspaces:state.workspaces,memories:state.memories,flows:state.flows,activity:state.activity,settings:{theme:state.settings.theme,motion:state.settings.motion}}; const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='vibeos-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
async function importData(event) { const file=event.target.files[0];if(!file)return;try { const parsed=JSON.parse(await file.text());if(parsed.schemaVersion!==2 || !Array.isArray(parsed.workspaces)||!Array.isArray(parsed.memories)||!Array.isArray(parsed.flows)) throw new Error('This is not a VibeOS version 2 export.');if(!confirm('Replace local VibeOS data with this export?'))return;await resetDb();for(const store of ['workspaces','memories','flows','activity'])for(const item of parsed[store]||[])await put(store,normalize(store,item));await put('settings',{...state.settings,...(parsed.settings||{}),id:'preferences',initialized:true});await loadState();await activity('Imported VibeOS data.');render();toast('Local data imported.'); } catch(error) { console.error('Import failed',error);toast(error.message || 'The selected file could not be imported.'); } finally { event.target.value=''; } }
async function resetData() { if(!confirm('Reset all VibeOS data stored on this device? This cannot be undone.'))return;await resetDb();state={workspaces:[],memories:[],flows:[],activity:[],settings:{...state.settings,initialized:false}};await loadState();render();toast('Local data was reset.'); }
async function install() { if(deferredInstall){deferredInstall.prompt();const choice=await deferredInstall.userChoice;deferredInstall=null;if(choice.outcome==='accepted')toast('VibeOS is installing.');return;} if(nativeBridge())return toast('You are using the native Android app.');dialog('Install VibeOS','<p>Install for faster launch, offline access, and a dedicated app window.</p><p>In Chrome on Android, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. On iPhone or iPad, use Share then <strong>Add to Home Screen</strong>.</p>'); }
async function start() { try { db=await openDb();await loadState();route=location.hash.slice(1) in routeNames ? location.hash.slice(1) : 'home';render(); } catch(error) { console.error('VibeOS could not start',error);$('#main').innerHTML=empty('VibeOS could not access local storage.','Check that private browsing or browser storage restrictions are not blocking this app, then reload.');} }
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(next in routeNames&&next!==route){route=next;render();}});
window.addEventListener('online',render);window.addEventListener('offline',render);window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;});window.addEventListener('appinstalled',()=>{deferredInstall=null;toast('VibeOS was installed.');});
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').then(registration=>{registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){updateReady=true;render();}});});}).catch(error=>console.error('Service worker registration failed',error));
start();
