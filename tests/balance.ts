import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { BUILDINGS, RESOURCES, upgradeCost, type BuildingType, type Cost } from '../src/config';
import { build, canAfford, commit, expand, gather, newGame, save, setRoute, tick, upgrade } from '../src/simulation';
// A reproducible first-time route: no free resources, time skips only simulate waiting.
const s=newGame();const log:{milestone:string;seconds:number}[]=[];
const mark=(milestone:string)=>log.push({milestone,seconds:Math.round(s.time)});
const manual=(ore:number)=>{for(let n=0;n<ore;n+=2){tick(s,.35);assert.ok(gather(s,0).ok);}};
function fund(cost:Cost,manualOre=false){for(const r of RESOURCES){let guard=0;while(s.stock[r]<(cost[r]??0)){const shortage=(cost[r]??0)-s.stock[r];if(r==='ore'&&manualOre&&s.islands[0].inventory.ore<shortage)manual(2);commit(s,0,r,shortage);if(s.stock[r]<(cost[r]??0))tick(s,1);if(++guard>3600)throw new Error(`Deadlock funding ${r}: ${JSON.stringify(cost)}`);}}}
function place(type:BuildingType,island:number,pad:number){fund(BUILDINGS[type].cost,true);assert.ok(build(s,type,island,pad).ok);mark(`${BUILDINGS[type].name} on island ${island+1}`);tick(s,12);}
manual(12);commit(s,0,'ore',12);assert.ok(build(s,'drill',0,0).ok);mark('First drill');tick(s,20);
fund(BUILDINGS.smelter.cost);assert.ok(build(s,'smelter',0,1).ok);mark('Smelter');tick(s,12);
place('workshop',0,2);
// Introduce upgrades early, and only temporarily commit exact amounts required.
const drill=s.buildings.find(b=>b.type==='drill')!;fund(upgradeCost('drill',1),true);assert.ok(upgrade(s,drill.id).ok);mark('Level 2 drill');
const smelter=s.buildings.find(b=>b.type==='smelter')!;fund(upgradeCost('smelter',1),true);assert.ok(upgrade(s,smelter.id).ok);mark('Level 2 smelter');
fund({ingot:30,gear:10});assert.ok(expand(s,1).ok);mark('Copperwind bridge');tick(s,15);
place('drill',1,0);place('dock',0,3);place('dock',1,1);
assert.ok(setRoute(s,1,0,'ore',10).ok);tick(s,17);assert.ok(s.deliveries>0);mark('First drone delivery');
// Keep baseline output for a deliberate, low-click first playthrough.
fund(BUILDINGS.beacon.cost);assert.ok(build(s,'beacon',0,4).ok);mark('Sky Beacon');
assert.ok(s.beacon);assert.ok(s.time<1200,`Beacon took ${s.time/60} minutes`);
writeFileSync('tests/beacon-fixture.json',JSON.stringify(s,null,2));
fund({ingot:55,gear:22});assert.ok(expand(s,2).ok);place('drill',2,0);place('smelter',2,1);place('workshop',2,2);place('dock',2,3);assert.ok(setRoute(s,2,1,'ingot',8).ok);
writeFileSync('tests/settlement-fixture.json',JSON.stringify(s,null,2));
console.table(log.map(v=>({milestone:v.milestone,time:`${Math.floor(v.seconds/60)}:${String(v.seconds%60).padStart(2,'0')}`})));
writeFileSync('tests/balance-results.json',JSON.stringify(log,null,2));
