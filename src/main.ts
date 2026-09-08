import * as T from 'three';
import './style.css';
import { BALANCE, BUILDINGS, ISLANDS, type BuildingType, type Resource } from './config';
import { build, canAfford, commit, expand, gather, newGame, remove, restore, save, setRoute, tick, unlockReason, upgrade, type GameState, type Result } from './simulation';
import { UI } from './ui';
import { World, type Hit } from './world';
const qa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa');
const saveKey=qa?BALANCE.saveKey+'-qa':BALANCE.saveKey;
let state:GameState=newGame();let saveAvailable=true;let corrupt=false;
try { const raw=localStorage.getItem(saveKey);if(raw){const loaded=restore(raw);if(loaded)state=loaded;else corrupt=true;} }catch{saveAvailable=false;}
let world:World;
try{world=new World(document.querySelector('#world')!);}catch(e){document.body.innerHTML='<div style="padding:60px;max-width:650px;font-family:system-ui"><h1>Your little world needs WebGL</h1><p>Enable hardware acceleration in your browser, then reload to begin. Your saved settlement is safe.</p></div>';throw e;}
let sound=false;let audio:AudioContext|null=null;function chime(freq=500){if(!sound)return;try{audio??=new AudioContext();void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*1.4,audio.currentTime+.1);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.2);}catch{sound=false;}}
const ui=new UI(document.querySelector('#ui')!,{action:(name,data)=>{void action(name,data);},route:(target,resource,reserve)=>{const b=state.buildings.find(b=>b.id===ui.selected);if(!b)return;result(setRoute(state,b.island,target,resource,reserve));ui.invalidate();}});
function persist(){try{localStorage.setItem(saveKey,save(state));saveAvailable=true;}catch{saveAvailable=false;}ui.saved(saveAvailable);}
function result(r:Result){ui.toast(r.message,!r.ok);if(r.ok){persist();chime();}ui.render(state);return r.ok;}
function open(panel:string){ui.placement=null;ui.panel=ui.panel===panel?'':panel;ui.invalidate();ui.render(state);}
function select(hit:Hit|null){if(!hit){if(!ui.placement){ui.selected=null;ui.panel='';}return;}
  if(hit.kind==='deposit'){if(ui.placement){ui.toast('Choose an empty construction pad',true);return;}if(state.islands[hit.island].unlocked)ui.island=hit.island;result(gather(state,hit.island));return;}
  if(hit.kind==='building'){if(ui.placement){ui.toast('This pad is occupied. Choose an empty pad.',true);return;}const b=state.buildings.find(b=>b.id===hit.id)!;ui.selected=b.id;ui.island=b.island;ui.panel=b.type==='hq'?'stock':'building';ui.invalidate();ui.render(state);return;}
  if(hit.kind==='pad'){
    if(ui.placement){const type=ui.placement;if(result(build(state,type,hit.island,hit.pad))){ui.placement=null;ui.selected=state.buildings.at(-1)!.id;ui.island=hit.island;ui.panel='building';ui.invalidate();if(type==='beacon')void celebrate();}}
    else if(state.islands[hit.island].unlocked){ui.island=hit.island;ui.toast('Choose a building from the build menu');}else open('map');
  }
}
world.onHit=select;
async function celebrate(){chime(850);await ui.confirm('A light in the sky','From a handful of iron to a thriving skyward settlement. Your Sky Beacon is complete. Continue building, upgrade your machines, and explore Starfall Isle.','Keep building',true);}
async function action(name:string,data:DOMStringMap){
  if(name==='build'){const type=data.type as BuildingType;const reason=unlockReason(state,type);if(reason){ui.toast(reason,true);return;}ui.placement=ui.placement===type?null:type;ui.selected=null;ui.panel='';if(ui.placement&&!canAfford(state.stock,BUILDINGS[type].cost))ui.toast('Commit resources to the headquarters stockpile to afford this building.');}
  else if(name==='gather')result(gather(state,ui.island));
  else if(name==='stock'||name==='map'||name==='help'||name==='settings')open(name);
  else if(name==='close'||name==='cancel'){ui.panel='';ui.placement=null;ui.selected=null;}
  else if(name==='home')world.home();
  else if(name==='checklist')ui.checklist=!ui.checklist;
  else if(name==='island'){const i=Number(data.island);if(state.islands[i].unlocked){ui.island=i;world.focus(i);}else {ui.panel='map';ui.placement=null;}ui.invalidate();}
  else if(name==='travel'){ui.island=Number(data.island);world.focus(ui.island);ui.panel='';}
  else if(name==='stock-island'){ui.island=Number(data.island);ui.invalidate();}
  else if(name==='commit'){const amount=data.amount==='all'?Infinity:Number(data.amount);result(commit(state,ui.island,data.resource as Resource|'all',amount));}
  else if(name==='upgrade'&&ui.selected){result(upgrade(state,ui.selected));ui.invalidate();}
  else if(name==='pause-machine'){const b=state.buildings.find(b=>b.id===ui.selected);if(b){b.paused=!b.paused;b.active=false;persist();ui.invalidate();}}
  else if(name==='expand'){const i=Number(data.island);if(result(expand(state,i))){ui.island=i;world.focus(i);ui.invalidate();}}
  else if(name==='remove'&&ui.selected){const id=ui.selected,b=state.buildings.find(b=>b.id===id);if(!b)return;const refund=Object.entries(b.invested).filter(([,v])=>v>0).map(([r,v])=>`${Math.floor(v*BALANCE.refund)} ${r==='ingot'?'ingots':r==='gear'?'gears':'ore'}`).join(', ');if(await ui.confirm(`Remove ${BUILDINGS[b.type].name}?`,`Returns 60% of all construction and upgrade costs to headquarters: ${refund}. Local inventory is kept.`,'Remove building')){if(result(remove(state,id))){ui.selected=null;ui.panel='';}ui.invalidate();}}
  else if(name==='pause-route'){const b=state.buildings.find(b=>b.id===ui.selected),r=state.routes.find(r=>r.source===b?.island);if(r){r.enabled=!r.enabled;persist();ui.invalidate();}}
  else if(name==='save'){persist();ui.toast(saveAvailable?'Settlement saved':'Browser storage is unavailable',!saveAvailable);}
  else if(name==='sound'){sound=!sound;ui.toast(`Soft machine sounds ${sound?'on':'off'}`);chime();}
  else if(name==='reset'){if(await ui.confirm('Begin again?','This permanently clears your settlement, stored resources, cargo routes, and Sky Beacon progress on this browser.','Start fresh')){state=newGame();ui.island=0;ui.selected=null;ui.placement=null;ui.panel='';ui.invalidate();world.home();persist();ui.toast('A fresh patch of sky. Welcome home.');}}
  ui.render(state);
}
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||(e.target as HTMLElement).matches('input,select,textarea'))return;if(e.key==='Escape'){void action('cancel',{});}if(/^[1-5]$/.test(e.key)){const type=(['drill','smelter','workshop','dock','beacon'] as BuildingType[])[Number(e.key)-1];void action('build',{type});}});
let knownDeliveries=state.deliveries;
let last=performance.now(),accumulator=0,uiTime=0,saveTime=0;let wasVisible=!document.hidden;
function frame(now:number){const dt=Math.min((now-last)/1000,.25);last=now;
  if(!document.hidden){if(wasVisible)accumulator+=dt;while(accumulator>=BALANCE.step){tick(state,BALANCE.step);accumulator-=BALANCE.step;}if(state.deliveries>knownDeliveries&&knownDeliveries===0)ui.toast('First cargo delivered. The Sky Beacon and Starfall Isle are unlocked.');knownDeliveries=state.deliveries;world.update(state,dt,ui.selected,ui.placement,!!ui.placement&&canAfford(state.stock,BUILDINGS[ui.placement].cost));
    for(const island of ISLANDS){const projected=world.project(new T.Vector3(island.x,island.y+2.6,island.z-island.radius-.5));const el=document.querySelector<HTMLElement>(`#label-${island.id}`)!;el.style.left=`${projected.x}px`;el.style.top=`${projected.y}px`;el.style.display=projected.visible?'':'none';}
    const spec=ISLANDS[ui.island];const pos=world.project(new T.Vector3(spec.x+spec.deposit[0],spec.y+.5,spec.z+spec.deposit[1]+1.7));const deposit=document.querySelector<HTMLElement>('#deposit-label')!;deposit.style.left=`${pos.x}px`;deposit.style.top=`${pos.y}px`;deposit.style.display=pos.visible&&!ui.placement?'':'none';
    uiTime+=dt;saveTime+=dt;if(uiTime>.25){ui.render(state);uiTime=0;}if(saveTime>5){persist();saveTime=0;}
  }wasVisible=!document.hidden;requestAnimationFrame(frame);
}
window.addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();accumulator=0;}last=performance.now();});
ui.render(state);ui.saved(saveAvailable);if(corrupt)ui.toast('The saved data could not be read. A fresh island is ready.',true);requestAnimationFrame(frame);
// Read-only diagnostics and ordinary game actions are available only in the local development build.
if(import.meta.env.DEV){Object.assign(window,{factory:{get state(){return state;},get world(){return world;},get ui(){return ui;},tick:(seconds:number)=>{tick(state,seconds);ui.render(state);},select,action,save:persist,replace:(value:GameState)=>{const valid=restore(save(value));if(!valid)throw new Error('Invalid fixture');state=valid;ui.invalidate();ui.render(state);}}});}

if(import.meta.env.DEV&&qa){
  const toolbar=document.createElement('aside');toolbar.className='qa-tools';toolbar.innerHTML='<strong>DEVELOPMENT PLAYTEST</strong><div><button data-qa="advance">Advance 60s</button><button data-qa="advance5">Advance 5s</button><button data-qa="fixture">Load verified settlement</button></div><output id="qa-metrics"></output>';document.body.append(toolbar);
  toolbar.addEventListener('click',async event=>{const el=(event.target as HTMLElement).closest<HTMLElement>('[data-qa]');if(!el)return;if(el.dataset.qa==='fixture'){const response=await fetch('/tests/settlement-fixture.json');const valid=restore(await response.text());if(valid){state=valid;ui.panel='';ui.selected=null;ui.invalidate();world.home();persist();}}else tick(state,el.dataset.qa==='advance5'?5:60);ui.render(state);});
  const frames:number[]=[];let previous=performance.now();function metrics(now:number){if(!document.hidden){frames.push(now-previous);if(frames.length>120)frames.shift();}previous=now;requestAnimationFrame(metrics);}requestAnimationFrame(metrics);
  setInterval(()=>{const sorted=[...frames].sort((a,b)=>a-b);toolbar.querySelector('output')!.textContent=`${Math.floor(state.time)}s · ${state.buildings.length} buildings · ${world.renderer.info.render.calls} draws · ${world.renderer.info.render.triangles.toLocaleString()} triangles · median ${sorted[Math.floor(sorted.length/2)]?.toFixed(1)}ms · p95 ${sorted[Math.floor(sorted.length*.95)]?.toFixed(1)}ms · ${innerWidth}×${innerHeight} @${world.renderer.getPixelRatio().toFixed(1)}`;},1000);
}
