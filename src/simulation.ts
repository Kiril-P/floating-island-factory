import { BALANCE, BUILDINGS, ISLANDS, LEVEL_MULTIPLIER, RESOURCES, emptyInventory, upgradeCost, type BuildingType, type Cost, type Inventory, type Resource } from './config';
export interface Building { id:number; type:BuildingType; island:number; pad:number; level:number; progress:number; active:boolean; cycles:number; invested:Inventory; paused:boolean }
export interface Route { id:number; source:number; target:number; resource:Resource; reserve:number; enabled:boolean; phase:'waiting'|'outbound'|'returning'; elapsed:number; cargo:number; delivered:number }
export interface GameState { version:1; time:number; stock:Inventory; islands:{unlocked:boolean; inventory:Inventory}[]; buildings:Building[]; routes:Route[]; nextId:number; manualAt:number; milestones:Record<string,boolean>; deliveries:number; beacon:boolean }
export type Result = {ok:boolean; message:string};
type RateEvent={time:number;island:number;delta:Inventory};
const rateHistory=new WeakMap<GameState,{started:number;events:RateEvent[]}>();
export const success = (message:string):Result => ({ok:true,message});
const failure = (message:string):Result => ({ok:false,message});
export function newGame():GameState {
  return {version:1,time:0,stock:emptyInventory(),islands:ISLANDS.map((_,i)=>({unlocked:i===0,inventory:emptyInventory()})),buildings:[{id:1,type:'hq',island:0,pad:-1,level:1,progress:0,active:false,cycles:0,invested:emptyInventory(),paused:false}],routes:[],nextId:2,manualAt:-1,milestones:{},deliveries:0,beacon:false};
}
export function canAfford(inv:Inventory,cost:Cost) { return RESOURCES.every(r=>inv[r]+1e-8 >= (cost[r]??0)); }
export function moveCost(inv:Inventory,cost:Cost,sign:number) { for(const r of RESOURCES) inv[r]=Math.max(0,inv[r]+(cost[r]??0)*sign); }
export function unlockReason(s:GameState,type:BuildingType):string {
  if(type==='smelter'&&!s.milestones.drill) return 'Build an iron drill first';
  if(type==='workshop'&&!s.milestones.smelter) return 'Build a smelter first';
  if(type==='dock'&&!s.islands[1].unlocked) return 'Bridge to Copperwind Reach';
  if(type==='beacon'&&s.deliveries<1) return 'Complete one drone delivery';
  if(type==='beacon'&&!s.buildings.some(b=>b.type==='drill'&&b.island===1)) return 'Build a drill on Copperwind Reach';
  if(type==='beacon'&&!['drill','smelter','workshop'].every(type=>s.buildings.some(b=>b.type===type))) return 'Maintain a drill, smelter, and workshop';
  return '';
}
export function gather(s:GameState,island:number):Result {
  if(!s.islands[island]?.unlocked) return failure('Build a bridge to reach this deposit');
  if(s.time-s.manualAt<BALANCE.manualCooldown) return failure('');
  s.manualAt=s.time;s.islands[island].inventory.ore+=BALANCE.manualOre;s.milestones.gather=true;
  return success(`+${BALANCE.manualOre} iron ore`);
}
export function commit(s:GameState,island:number,resource:Resource|'all',amount=Infinity):Result {
  if(!s.islands[island]?.unlocked) return failure('This island is not accessible');
  if(amount<=0||Number.isNaN(amount)) return failure('Choose a positive amount');
  let total=0; for(const r of resource==='all'?RESOURCES:[resource]) {const q=Math.min(s.islands[island].inventory[r],amount);s.islands[island].inventory[r]-=q;s.stock[r]+=q;total+=q;}
  return total>0?success('Resources committed to headquarters'):failure('No resources to commit yet');
}
export function placementReason(s:GameState,type:BuildingType,island:number,pad:number):string {
  if(type==='hq') return 'Headquarters is already built';
  if(!s.islands[island]?.unlocked) return 'Build a bridge to this island first';
  if(!ISLANDS[island].pads[pad]) return 'Choose a construction pad';
  if(s.buildings.some(b=>b.island===island&&b.pad===pad)) return 'This pad is occupied';
  const reason=unlockReason(s,type);if(reason) return reason;
  if(type==='beacon'&&s.beacon) return 'Your Sky Beacon is already shining';
  if(type==='dock'&&s.buildings.some(b=>b.island===island&&b.type==='dock')) return 'One drone dock per island';
  if(!canAfford(s.stock,BUILDINGS[type].cost)) return 'Not enough in the construction stockpile. Commit local resources.';
  return '';
}
export function build(s:GameState,type:BuildingType,island:number,pad:number):Result {
  const reason=placementReason(s,type,island,pad);if(reason)return failure(reason);
  const spec=BUILDINGS[type];
  moveCost(s.stock,spec.cost,-1);const invested=emptyInventory();moveCost(invested,spec.cost,1);
  s.buildings.push({id:s.nextId++,type,island,pad,level:1,progress:0,active:false,cycles:0,invested,paused:false});
  s.milestones[type]=true;if(type==='drill'&&island===1)s.milestones.outpost=true;
  if(type==='beacon')s.beacon=true;
  return success(type==='beacon'?'The sky is a little brighter. Beacon complete!':`${spec.name} built`);
}
export function upgrade(s:GameState,id:number):Result {
  const b=s.buildings.find(b=>b.id===id);if(!b) return failure('Building not found');
  if(!['drill','smelter','workshop'].includes(b.type)) return failure('This building has no upgrades');
  if(b.level>=3)return failure('Maximum level reached');
  const cost=upgradeCost(b.type,b.level);if(!canAfford(s.stock,cost))return failure('Commit more resources to headquarters to upgrade');
  moveCost(s.stock,cost,-1);moveCost(b.invested,cost,1);b.level++;
  return success(`${BUILDINGS[b.type].name} upgraded to level ${b.level}`);
}
export function remove(s:GameState,id:number):Result {
  const b=s.buildings.find(b=>b.id===id);if(!b||b.type==='hq')return failure('Headquarters cannot be removed');
  if(b.type==='dock'&&s.routes.some(r=>(r.source===b.island||r.target===b.island)&&(r.phase!=='waiting'||r.cargo>0)))return failure('Wait for the drone to return before removing this dock');
  if(b.type==='dock')s.routes=s.routes.filter(r=>r.source!==b.island&&r.target!==b.island);
  for(const r of RESOURCES)s.stock[r]+=Math.floor(b.invested[r]*BALANCE.refund);
  s.buildings=s.buildings.filter(v=>v.id!==id);if(b.type==='beacon')s.beacon=false;
  return success('Building removed. 60% refunded to headquarters.');
}
export function expansionReason(s:GameState,island:number):string {
  if(island===1&&!s.milestones.workshop)return 'Build a workshop first';
  if(island===2&&!s.deliveries)return 'Complete a drone delivery first';
  if(island===2&&!s.islands[1].unlocked)return 'Reach Copperwind first';
  return '';
}
export function expand(s:GameState,island:number):Result {
  if(island<1||!s.islands[island])return failure('Unknown island');if(s.islands[island].unlocked)return failure('This bridge is already built');
  const reason=expansionReason(s,island);if(reason)return failure(reason);
  if(!canAfford(s.stock,ISLANDS[island].cost))return failure('Not enough in the construction stockpile');
  moveCost(s.stock,ISLANDS[island].cost,-1);s.islands[island].unlocked=true;
  return success(`Bridge complete. Welcome to ${ISLANDS[island].name}!`);
}
export function setRoute(s:GameState,source:number,target:number,resource:Resource,reserve:number):Result {
  if(source===target||!RESOURCES.includes(resource)||!Number.isFinite(reserve)||reserve<0)return failure('Choose two islands and a valid reserve');
  if(![source,target].every(i=>s.buildings.some(b=>b.island===i&&b.type==='dock')))return failure('Build a drone dock on both islands');
  const old=s.routes.find(r=>r.source===source);
  if(old&&old.phase!=='waiting')return failure('Wait for the drone to return before changing its route');
  if(old)Object.assign(old,{target,resource,reserve,enabled:true,elapsed:0});
  else s.routes.push({id:s.nextId++,source,target,resource,reserve,enabled:true,phase:'waiting',elapsed:0,cargo:0,delivered:0});
  return success('Cargo route ready for departure');
}
export function machineStatus(s:GameState,b:Building):string {
  if(b.type==='hq')return 'Construction stockpile';if(b.type==='beacon')return 'Lighting the way';if(b.type==='dock')return 'Ready for cargo routes';
  if(b.paused)return 'Paused';const spec=BUILDINGS[b.type];if(!canAfford(s.islands[b.island].inventory,spec.input))return `Waiting for ${spec.input.ore?'iron ore':'iron ingots'}`;
  return 'Producing';
}
export function tick(s:GameState,dt:number) {
  if(!Number.isFinite(dt)||dt<=0)return;
  // Process in bounded slices: recipes, drone travel, and input starvation are frame-independent.
  if(!rateHistory.has(s))rateHistory.set(s,{started:s.time,events:[]});const history=rateHistory.get(s)!;
  let left=dt;while(left>1e-8){const delta=Math.min(left,BALANCE.step);left-=delta;s.time+=delta;
    for(const b of s.buildings){const def=BUILDINGS[b.type];b.active=false;if(!def.cycle||b.paused)continue;
      const inv=s.islands[b.island].inventory;if(!canAfford(inv,def.input))continue;
      b.active=true;b.progress+=delta*LEVEL_MULTIPLIER[b.level]/def.cycle;
      while(b.progress>=1-1e-9&&canAfford(inv,def.input)){moveCost(inv,def.input,-1);moveCost(inv,def.output,1);b.progress=Math.max(0,b.progress-1);b.cycles++;const delta=emptyInventory();for(const r of RESOURCES)delta[r]=(def.output[r]??0)-(def.input[r]??0);history.events.push({time:s.time,island:b.island,delta});}
    }
    while(history.events.length&&history.events[0].time<s.time-30)history.events.shift();
    for(const route of s.routes){route.elapsed+=delta;
      if(route.phase==='waiting'){
        if(!route.enabled)continue;
        const surplus=Math.floor(s.islands[route.source].inventory[route.resource]-route.reserve);
        if(route.elapsed>=BALANCE.dockWait-1e-8&&surplus>0){route.cargo=Math.min(surplus,BALANCE.capacity);s.islands[route.source].inventory[route.resource]-=route.cargo;route.phase='outbound';route.elapsed=0;}
      } else if(route.elapsed>=BALANCE.flightSeconds-1e-8) {
        if(route.phase==='outbound'){s.islands[route.target].inventory[route.resource]+=route.cargo;route.delivered+=route.cargo;route.cargo=0;s.deliveries++;route.phase='returning';route.elapsed=0;}
        else {route.phase='waiting';route.elapsed=0;}
      }
    }
  }
}
export function netRates(s:GameState,island:number):Inventory {
  const rates=emptyInventory(),history=rateHistory.get(s);if(!history)return rates;
  const span=Math.min(30,s.time-history.started);if(span<1)return rates;
  for(const event of history.events)if(event.island===island)for(const r of RESOURCES)rates[r]+=event.delta[r]*60/span;
  return rates;
}
export function save(s:GameState):string{return JSON.stringify(s);}
export function restore(raw:string):GameState|null {
  try{
    const s=JSON.parse(raw) as GameState;
    const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const inventory=(v:Inventory)=>v&&RESOURCES.every(r=>finite(v[r]));
    if(s.version!==1||!finite(s.time)||!inventory(s.stock)||!Array.isArray(s.islands)||s.islands.length!==3||!s.islands.every(i=>typeof i.unlocked==='boolean'&&inventory(i.inventory))||!s.islands[0].unlocked)return null;
    if(!Array.isArray(s.buildings)||s.buildings.length>18||!Array.isArray(s.routes)||!s.milestones||typeof s.milestones!=='object'||!finite(s.deliveries)||typeof s.beacon!=='boolean')return null;
    const ids=new Set<number>();const pads=new Set<string>();const docks=new Set<number>();
    for(const b of s.buildings){if(!Number.isInteger(b.id)||ids.has(b.id)||!BUILDINGS[b.type]||!Number.isInteger(b.island)||!s.islands[b.island]?.unlocked||![1,2,3].includes(b.level)||!finite(b.progress)||b.progress>1||!finite(b.cycles)||!inventory(b.invested)||typeof b.paused!=='boolean')return null;
      const key=`${b.island}:${b.pad}`;if(pads.has(key))return null;pads.add(key);ids.add(b.id);
      if(b.type==='hq'){if(b.island!==0||b.pad!==-1)return null;}else if(!Number.isInteger(b.pad)||!ISLANDS[b.island].pads[b.pad])return null;
      if(b.type==='dock'){if(docks.has(b.island))return null;docks.add(b.island);}b.active=false;
    }
    if(s.buildings.filter(b=>b.type==='hq').length!==1||s.buildings.filter(b=>b.type==='beacon').length>1||s.beacon!==s.buildings.some(b=>b.type==='beacon'))return null;
    const sources=new Set<number>();
    for(const r of s.routes){if(!Number.isInteger(r.id)||ids.has(r.id)||sources.has(r.source)||!docks.has(r.source)||!docks.has(r.target)||r.source===r.target||!RESOURCES.includes(r.resource)||!finite(r.reserve)||!finite(r.elapsed)||!finite(r.delivered)||!Number.isInteger(r.cargo)||r.cargo<0||r.cargo>BALANCE.capacity||!['waiting','outbound','returning'].includes(r.phase)||typeof r.enabled!=='boolean')return null;
      if(r.phase!=='outbound'&&r.cargo!==0)return null;if(r.phase==='outbound'&&r.cargo===0)return null;
      if(r.phase!=='waiting'&&r.elapsed>BALANCE.flightSeconds)return null;ids.add(r.id);sources.add(r.source);
    }
    if(!Number.isInteger(s.nextId)||s.nextId<=Math.max(...ids)||typeof s.manualAt!=='number'||!Number.isFinite(s.manualAt))return null;
    return s;
  }catch{return null;}
}
