export const RESOURCES = ['ore', 'ingot', 'gear'] as const;
export type Resource = typeof RESOURCES[number];
export type Inventory = Record<Resource, number>;
export type Cost = Partial<Inventory>;
export type BuildingType = 'hq' | 'drill' | 'smelter' | 'workshop' | 'dock' | 'beacon';
export const RESOURCE = {
  ore: { name: 'Iron ore', short: 'Ore', icon: 'mountain', color: '#a3b9c4' },
  ingot: { name: 'Iron ingots', short: 'Ingots', icon: 'layers', color: '#edbb78' },
  gear: { name: 'Gears', short: 'Gears', icon: 'settings', color: '#8dcebd' },
};
export const BUILDINGS: Record<BuildingType, {name:string; icon:string; description:string; cost:Cost; input:Cost; output:Cost; cycle:number; color:string}> = {
  hq: {name:'Headquarters',icon:'house',description:'Your home above the clouds. Holds the shared construction stockpile.',cost:{},input:{},output:{},cycle:0,color:'#e5aa54'},
  drill: {name:'Iron drill',icon:'drill',description:'A tireless little prospector. Extracts iron from the island below.',cost:{ore:12},input:{},output:{ore:2},cycle:3,color:'#efbd62'},
  smelter: {name:'Smelter',icon:'flame',description:'Warm hearth, bright metal. Refines raw ore into iron ingots.',cost:{ore:26},input:{ore:2},output:{ingot:1},cycle:3,color:'#d98155'},
  workshop: {name:'Workshop',icon:'settings',description:'A rhythmic press that turns iron ingots into precision gears.',cost:{ore:18,ingot:10},input:{ingot:3},output:{gear:1},cycle:5,color:'#6eb6a5'},
  dock: {name:'Drone dock',icon:'send',description:'Pair two docks to carry surplus resources between islands.',cost:{ingot:24,gear:8},input:{},output:{},cycle:0,color:'#6aaac4'},
  beacon: {name:'Sky Beacon',icon:'sparkles',description:'Send a little light into the great blue. Your first skyward milestone.',cost:{ore:70,ingot:100,gear:55},input:{},output:{},cycle:0,color:'#a8c5e8'},
};
export const BALANCE = { manualOre:2, manualCooldown:0.22, refund:0.6, capacity:12, flightSeconds:12, dockWait:4, step:0.1, saveKey:'floating-island-factory-v1' };
export interface IslandSpec { id:number; name:string; subtitle:string; x:number; y:number; z:number; radius:number; pads:[number,number][]; deposit:[number,number]; cost:Cost }
export const ISLANDS: IslandSpec[] = [
  {id:0,name:'Hearth Island',subtitle:'A small beginning',x:-3,y:0,z:2,radius:7.1,pads:[[0,-2.7],[3,-2.7],[0,0.7],[3,0.7],[-1,4],[2.5,4],[-4,4]],deposit:[-4,1.2],cost:{}},
  {id:1,name:'Copperwind Reach',subtitle:'Room to grow',x:14,y:0.8,z:-5,radius:5.7,pads:[[-2,-2],[1.5,-2],[-2,1.5],[1.5,1.5],[0,4]],deposit:[3.6,-0.4],cost:{ingot:30,gear:10}},
  {id:2,name:'Starfall Isle',subtitle:'A light on the horizon',x:-7,y:1.5,z:-17,radius:5.1,pads:[[-1.8,-1.5],[1.7,-1.5],[-1.8,1.8],[1.7,1.8]],deposit:[0,-3.5],cost:{ingot:55,gear:22}},
];
export const emptyInventory = (): Inventory => ({ore:0,ingot:0,gear:0});
export function upgradeCost(type:BuildingType, level:number): Cost {
  return level === 1 ? {ore:20,ingot:8} : {ingot:26,gear:8};
}
export const LEVEL_MULTIPLIER = [0,1,1.7,2.6];
