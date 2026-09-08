import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BuildingType, IslandSpec } from './config';
const geometryCache=new Map<string,T.BufferGeometry>();
function geo(key:string,make:()=>T.BufferGeometry){if(!geometryCache.has(key))geometryCache.set(key,make());return geometryCache.get(key)!;}
export const palette={
  cream: new T.MeshStandardMaterial({color:0xf3e2b9,roughness:.75}),
  white: new T.MeshStandardMaterial({color:0xfff4d9,roughness:.65}),
  teal: new T.MeshStandardMaterial({color:0x397f7c,roughness:.55,metalness:.2}),
  dark: new T.MeshStandardMaterial({color:0x29484d,roughness:.62,metalness:.25}),
  metal: new T.MeshStandardMaterial({color:0x8caaab,roughness:.48,metalness:.45}),
  brass: new T.MeshStandardMaterial({color:0xe9b359,roughness:.45,metalness:.3}),
  rust: new T.MeshStandardMaterial({color:0xb96743,roughness:.75}),
  wood: new T.MeshStandardMaterial({color:0xa57248,roughness:.9}),
  plank: new T.MeshStandardMaterial({color:0xe0b87e,roughness:.85}),
  stone: new T.MeshStandardMaterial({color:0xaeb4a1,roughness:1}),
  rock: new T.MeshStandardMaterial({color:0x748e8e,roughness:1,flatShading:true}),
  grass: new T.MeshStandardMaterial({color:0xa6bf65,roughness:1}),
  leaf: new T.MeshStandardMaterial({color:0x7c9d48,roughness:1,flatShading:true}),
  leafLight: new T.MeshStandardMaterial({color:0xc4ce75,roughness:1,flatShading:true}),
  glow: new T.MeshStandardMaterial({color:0xffc36b,emissive:0xf88127,emissiveIntensity:1.2,roughness:.4}),
  crystal: new T.MeshStandardMaterial({color:0xb1efeb,emissive:0x55c6cb,emissiveIntensity:.7,metalness:.25,roughness:.25,flatShading:true}),
  belt: new T.MeshStandardMaterial({color:0x41575c,roughness:.95}),
};
type Mat=T.Material;
function mesh(g:T.BufferGeometry,m:Mat,p:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
export function box(p:T.Object3D,m:Mat,w:number,h:number,d:number,x=0,y=0,z=0,round=.04){return mesh(geo(`b${w},${h},${d},${round}`,()=>round?new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d)),m,p,x,y,z);}
export function cylinder(p:T.Object3D,m:Mat,rt:number,rb:number,h:number,x=0,y=0,z=0,n=12){return mesh(geo(`c${rt},${rb},${h},${n}`,()=>new T.CylinderGeometry(rt,rb,h,n)),m,p,x,y,z);}
function sphere(p:T.Object3D,m:Mat,r:number,x=0,y=0,z=0,detail=0){return mesh(geo(`i${r},${detail}`,()=>new T.IcosahedronGeometry(r,detail)),m,p,x,y,z);}
function torus(p:T.Object3D,m:Mat,r:number,t:number,x=0,y=0,z=0){return mesh(geo(`t${r},${t}`,()=>new T.TorusGeometry(r,t,6,24)),m,p,x,y,z);}
export function beam(p:T.Object3D,m:Mat,a:T.Vector3,b:T.Vector3,w=.1){const o=box(p,m,w,a.distanceTo(b),w,0,0,0,.015);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
function gear(p:T.Object3D,r:number,x:number,y:number,z:number){const g=new T.Group();g.position.set(x,y,z);p.add(g);const hub=cylinder(g,palette.brass,r*.78,r*.78,.13);hub.rotation.x=Math.PI/2;for(let i=0;i<10;i++){const a=i*Math.PI/5;const t=box(g,palette.brass,r*.36,r*.38,.15,Math.sin(a)*r*.84,Math.cos(a)*r*.84,0,.018);t.rotation.z=-a;}const bolt=cylinder(g,palette.dark,.12,.12,.17,0,0,.04,8);bolt.rotation.x=Math.PI/2;return g;}
function crate(p:T.Object3D,x:number,y:number,z:number,size=.55){box(p,palette.wood,size,size,size,x,y+size/2,z);for(const d of [-1,1]){box(p,palette.brass,.045,size+.015,size+.02,x+d*size*.3,y+size/2,z,.01);box(p,palette.plank,size+.02,.045,size+.02,x,y+size*(d===1?.85:.15),z,.01);}}
export interface Model {root:T.Group; moving:T.Object3D[]; pistons:T.Object3D[]; glow:T.Mesh[]; smoke?:T.Group; ports:{input:T.Vector3;output:T.Vector3}; kind:BuildingType}
export function buildingModel(type:BuildingType,level=1):Model {
  const root=new T.Group();const moving:T.Object3D[]=[];const pistons:T.Object3D[]=[];const glow:T.Mesh[]=[];const p=palette;
  const model:Model={root,moving,pistons,glow,ports:{input:new T.Vector3(-1.3,.35,1),output:new T.Vector3(1.3,.35,1)},kind:type};
  box(root,p.stone,2.7,.19,2.65,0,.07,0,.12);box(root,p.dark,2.38,.16,2.3,0,.22,0);
  for(const x of [-.95,.95])for(const z of [-.9,.9])box(root,p.cream,.23,.27,.23,x,.26,z);
  if(type==='hq'){
    box(root,p.cream,2.15,1.6,1.8,0,1,0,.1);box(root,p.teal,2.3,.15,1.93,0,1.8,0);
    const dome=mesh(geo('dome',()=>new T.SphereGeometry(1.23,16,8,0,Math.PI*2,0,Math.PI/2)),p.teal,root,0,1.88,0);dome.scale.z=.9;
    cylinder(root,p.brass,.14,.14,.7,0,3.14,0);const gauge=new T.Group();gauge.position.set(0,3.52,0);root.add(gauge);box(gauge,p.brass,1.15,.08,.08);const fin=box(gauge,p.rust,.32,.3,.06,.45,.1,0);fin.rotation.z=-.3;moving.push(gauge);
    box(root,p.dark,.54,1.13,.08,.4,.8,.94);box(root,p.brass,.65,.08,.18,.4,1.4,.99);box(root,p.plank,.85,.14,.42,.4,.28,1.12);
    for(const x of [-.64]){box(root,p.dark,.6,.68,.07,x,1.12,.94);glow.push(box(root,p.glow,.44,.5,.08,x,1.12,.985));box(root,p.cream,.055,.58,.1,x,1.12,1.04);box(root,p.cream,.5,.055,.1,x,1.12,1.04);}
    box(root,p.dark,.08,.66,.62,1.1,1.12,0);glow.push(box(root,p.glow,.08,.48,.46,1.15,1.12,0));
    crate(root,-.87,.28,1.15,.45);crate(root,-1.22,.28,.63,.45);cylinder(root,p.dark,.16,.16,1.5,-.75,2,-.55);cylinder(root,p.brass,.24,.24,.12,-.75,2.78,-.55);
  }else if(type==='drill'){
    box(root,p.teal,1.4,.62,1.6,0,.55,-.1);box(root,p.brass,1.65,.15,1.78,0,.91,-.1);
    for(const x of [-.67,.67]){box(root,p.dark,.18,1.55,.2,x,1.5,-.38);box(root,p.brass,.3,.17,.35,x,1,-.38);}
    box(root,p.cream,1.65,.38,.75,0,2.28,-.38);box(root,p.brass,.9,.46,.65,0,2.62,-.38);
    const shaft=new T.Group();shaft.position.set(0,1.5,.25);root.add(shaft);cylinder(shaft,p.metal,.16,.16,1.55);cylinder(shaft,p.dark,0,.32,.48,0,-.88,0);
    for(let i=0;i<9;i++){const ring=box(shaft,p.metal,.59,.085,.2,0,-.65+i*.16,0,.02);ring.rotation.y=i*.75;}moving.push(shaft);
    moving.push(gear(root,.4,-.85,1.2,.45));const piston=cylinder(root,p.metal,.065,.065,.8,.69,1.65,.35);pistons.push(piston);
    box(root,p.rust,.7,.28,.75,1,.56,.57);for(const z of [.2,.94])box(root,p.brass,.76,.38,.09,1,.76,z);for(const x of [.65,1.35])box(root,p.brass,.08,.38,.75,x,.76,.57);sphere(root,p.rock,.24,1,.72,.53);
    glow.push(box(root,p.glow,.17,.14,.07,-.43,.61,.74));
  }else if(type==='smelter'){
    cylinder(root,p.rust,.87,1,1.55,0,1.04,0,10);cylinder(root,p.dark,.94,.96,.14,0,.44,0,10);cylinder(root,p.brass,.9,.9,.14,0,1.58,0,10);
    cylinder(root,p.dark,.4,.73,.37,0,1.98,0);cylinder(root,p.rust,.3,.33,1.12,0,2.68,0);cylinder(root,p.dark,.39,.39,.16,0,3.23,0);
    box(root,p.dark,1.13,.89,.32,0,.85,.78,.15);glow.push(box(root,p.glow,.78,.53,.09,0,.8,.97,.12));for(const x of [-.27,0,.27])box(root,p.dark,.07,.54,.09,x,.8,1.04);
    box(root,p.metal,.85,.09,.62,0,.42,1.15);cylinder(root,p.teal,.26,.26,1.14,1,1.04,-.33);const pipe=torus(root,p.brass,.37,.105,.79,1.58,-.32);pipe.rotation.y=Math.PI/2;
    const smoke=new T.Group();root.add(smoke);for(let i=0;i<4;i++){const m=new T.MeshStandardMaterial({color:0xe2d8bd,transparent:true,opacity:.2,depthWrite:false,roughness:1});const puff=sphere(smoke,m,.25,0,3.5+i*.37,0,1);puff.castShadow=false;}model.smoke=smoke;
  }else if(type==='workshop'){
    box(root,p.teal,1.9,.75,1.65,0,.7,0);box(root,p.plank,2.22,.19,1.86,0,1.16,0);for(const x of [-.85,.85]){box(root,p.cream,.21,1.35,.27,x,1.86,-.45);box(root,p.dark,.22,1.15,.22,x,1.75,.3);}
    box(root,p.teal,2.1,.42,1.13,0,2.47,-.13);box(root,p.brass,2.22,.1,1.23,0,2.71,-.13);
    cylinder(root,p.metal,.16,.16,.78,0,1.96,0);const press=box(root,p.dark,1.15,.26,.85,0,1.61,0);pistons.push(press);
    moving.push(gear(root,.49,0,2.48,.53));moving.push(gear(root,.26,.75,.68,.89));box(root,p.rust,.7,.12,.55,.65,1.3,.5);
    crate(root,-1,.3,1,.44);glow.push(box(root,p.glow,.15,.2,.08,.66,2.45,.49));
  }else if(type==='dock'){
    for(const x of [-1,1])for(const z of [-.85,.85]){box(root,p.teal,.18,1.15,.18,x,.84,z);beam(root,p.brass,new T.Vector3(x,.4,z),new T.Vector3(-x,1.3,z),.08);}
    box(root,p.cream,2.85,.2,2.4,0,1.48,0);box(root,p.teal,2.55,.045,2.15,0,1.6,0);const mark=torus(root,p.cream,.65,.055,0,1.635,0);mark.rotation.x=-Math.PI/2;box(root,p.cream,.09,.02,.6,0,1.64,0);
    cylinder(root,p.dark,.06,.08,2.2,1.15,2,-.94);const mast=torus(root,p.brass,.3,.045,1.15,3.03,-.94);mast.rotation.y=.3;glow.push(sphere(root,p.glow,.105,1.15,3.2,-.94,1));
    for(const x of [-1.25,1.25])for(const z of [-1,1])glow.push(cylinder(root,p.crystal,.065,.07,.15,x,1.69,z));crate(root,-.75,.29,.6,.6);crate(root,-.14,.29,.55,.5);
    box(root,p.brass,.4,.09,.5,1,1,-1.05);box(root,p.brass,.4,.09,.5,1,.6,-1.2);
  }else if(type==='beacon'){
    cylinder(root,p.cream,1.05,1.27,.5,0,.51,0,8);cylinder(root,p.teal,.66,.9,.74,0,1.08,0,8);cylinder(root,p.cream,.31,.53,3.18,0,2.48,0,8);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const fin=box(root,p.brass,.17,2.4,.35,Math.sin(a)*.53,2.21,Math.cos(a)*.53);fin.rotation.y=a;}
    for(let i=0;i<2;i++){const ring=torus(root,p.brass,1.06+i*.24,.095,0,3.67+i*.5,0);ring.rotation.x=Math.PI/2+(i?-.35:.3);moving.push(ring);}
    const crystal=new T.Group();crystal.position.y=4.5;root.add(crystal);cylinder(crystal,p.crystal,0,.48,.95,0,.46,0,6);cylinder(crystal,p.crystal,.48,0,.7,0,-.36,0,6);moving.push(crystal);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;glow.push(sphere(root,p.crystal,.13,Math.sin(a),.79,Math.cos(a),1));}
  }
  if(['drill','smelter','workshop'].includes(type)){
    for(let i=1;i<level;i++){cylinder(root,p.teal,.22,.24,.7,-1.05,.72,-.72+(i-1)*.62);cylinder(root,p.brass,.25,.25,.08,-1.05,1.08,-.72+(i-1)*.62);}
    if(level===3){box(root,p.brass,.32,.54,.46,1.05,1.76,-.5);moving.push(gear(root,.26,1.05,1.78,-.23));}
    // Model-owned lights can dim independently, while all structural materials remain shared.
    for(const light of glow)light.material=(light.material as T.Material).clone();
  }
  root.traverse(o=>{if(o instanceof T.Mesh)o.userData.building=true;});
  return model;
}
export function animateModel(model:Model,t:number,active:boolean,dt:number){
  const always=['hq','beacon'].includes(model.kind);if(active||always)for(let i=0;i<model.moving.length;i++){const m=model.moving[i];if(model.kind==='hq'||(model.kind==='drill'&&i===0)||model.kind==='beacon')m.rotation.y+=dt*1.32;else m.rotation.z-=dt*2.7;}
  for(const p of model.pistons){if(p.userData.rest===undefined)p.userData.rest=p.position.y;if(active)p.position.y=p.userData.rest+Math.sin(t*5)*.19;}
  if(['drill','smelter','workshop'].includes(model.kind))for(const g of model.glow)(g.material as T.MeshStandardMaterial).emissiveIntensity=active?1.1:.08;
  if(model.smoke){model.smoke.visible=active;model.smoke.children.forEach((p,i)=>{const f=(t*.3+i*.25)%1;p.position.set(f*.5,3.4+f*1.6,0);p.scale.setScalar(.7+f*1.6);(p as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.opacity=(1-f)*.19;});}
}
export function disposeModel(model:Model){for(const g of model.glow)if(['drill','smelter','workshop'].includes(model.kind))(g.material as T.Material).dispose();model.smoke?.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).dispose();});}
export function seeded(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function islandModel(spec:IslandSpec){
  const root=new T.Group();root.position.set(spec.x,spec.y,spec.z);const random=seeded(81+spec.id*77);const n=15;const points:Array<[number,number]>=[];
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const r=spec.radius*(.88+random()*.16);points.push([Math.cos(a)*r,Math.sin(a)*r]);}
  const verts:number[]=[];const colors:number[]=[];
  const add=(a:number[],b:number[],c:number[],color:T.Color)=>{verts.push(...a,...b,...c);for(let k=0;k<3;k++)colors.push(color.r,color.g,color.b);};
  const rings=[{scale:1,y:-.03},{scale:1.02,y:-.6},{scale:.84,y:-1.45},{scale:.57,y:-3.6},{scale:.2,y:-5.9}];
  const ringPoints=rings.map((r,j)=>points.map(([x,z])=>[x*r.scale+j*.12,r.y+(j>1?random()*.4:0),z*r.scale]));
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){
    const next=(i+1)%n;const a=rings[j],b=rings[j+1];const col=new T.Color(j===0?0xc49d6c:j===1?0x9c8d75:0x788d8a).multiplyScalar(.83+random()*.3);
    const p1=ringPoints[j][i],p2=ringPoints[j][next],p3=ringPoints[j+1][i],p4=ringPoints[j+1][next];
    add(p1,p3,p2,col);add(p2,p3,p4,col.clone().multiplyScalar(.94));
  }
  for(let i=0;i<n;i++){const col=new T.Color(0x91b55e).multiplyScalar(.97+random()*.06);add([0,0,0],[...([points[(i+1)%n][0],0,points[(i+1)%n][1]])],[points[i][0],0,points[i][1]],col);const a=rings.at(-1)!;add(ringPoints.at(-1)![i],[.4,-6.4,.2],ringPoints.at(-1)![(i+1)%n],new T.Color(0x657f80));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const land=mesh(g,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:T.DoubleSide}),root);land.userData.island=spec.id;
  // The paths are low inset stepping stones; pads stay clear for the full building footprint.
  for(let i=0;i<20;i++){const a=random()*Math.PI*2;const r=spec.radius*(.78+random()*.16);const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(spec.pads.some(([px,pz])=>Math.hypot(px-x,pz-z)<1.7)||Math.hypot(spec.deposit[0]-x,spec.deposit[1]-z)<1.2)continue;
    if(i%3===0){const tree=new T.Group();tree.position.set(x,0,z);root.add(tree);cylinder(tree,palette.wood,.09,.14,.8,0,.42,0,6);sphere(tree,i%2?palette.leaf:palette.leafLight,.7,0,1.15,0,1).scale.set(.85,1.25,.85);sphere(tree,palette.leafLight,.42,.3,1.02,.1,0);}
    else sphere(root,palette.rock,.18+random()*.22,x,.13,z).scale.set(1.5,.8,1);
  }
  const grassGeometry=geo('tuft',()=>new T.ConeGeometry(.07,.35,3));const inst=new T.InstancedMesh(grassGeometry,palette.leaf,110);const mat=new T.Matrix4();let placed=0;
  for(let i=0;i<250&&placed<110;i++){const x=(random()-.5)*spec.radius*1.85,z=(random()-.5)*spec.radius*1.85;if(Math.hypot(x,z)>spec.radius*.89||spec.pads.some(([px,pz])=>Math.hypot(px-x,pz-z)<1.65)||(spec.id===0&&Math.hypot(x+3,z+1.5)<2))continue;mat.makeTranslation(x,.13,z);inst.setMatrixAt(placed++,mat);}inst.count=placed;root.add(inst);
  for(let i=0;i<7;i++){const a=random()*Math.PI*2;const x=Math.cos(a)*spec.radius*.92,z=Math.sin(a)*spec.radius*.92;beam(root,palette.wood,new T.Vector3(x,-.45,z),new T.Vector3(x*.83,-2-random(),z*.87),.075);}
  for(let i=0;i<4;i++){const a=i*1.7;const x=Math.cos(a)*spec.radius*.6,z=Math.sin(a)*spec.radius*.6;const shard=cylinder(root,palette.crystal,0,.2,.9,x,-1.9,z,5);shard.rotation.z=.3+a;}
  const deposit=new T.Group();deposit.position.set(spec.deposit[0],0,spec.deposit[1]);root.add(deposit);
  cylinder(deposit,palette.stone,1,1.1,.12,0,.03,0,10);
  for(let i=0;i<7;i++){const a=i*2.4;const r=i===0?0:.5;const stone=sphere(deposit,palette.rock,i===0?.61:.4,Math.cos(a)*r,.32,Math.sin(a)*r);stone.scale.y=1.2;const seam=box(deposit,palette.brass,.09,.4,.12,Math.cos(a)*r,.57,Math.sin(a)*r+.26);seam.rotation.z=a;}
  deposit.traverse(o=>o.userData.deposit=spec.id);
  return root;
}
export function bridgeModel(from:T.Vector3,to:T.Vector3){const root=new T.Group();const d=to.clone().sub(from);const len=d.length();root.position.copy(from).add(to).multiplyScalar(.5);root.rotation.set(-Math.atan2(d.y,Math.hypot(d.x,d.z)),Math.atan2(d.x,d.z),0,'YXZ');
  const n=Math.ceil(len/.43);for(let i=0;i<n;i++)box(root,palette.plank,1.65,.15,len/n*.95,0,0,-len/2+(i+.5)*len/n,.02);
  for(const x of [-.85,.85]){box(root,palette.dark,.16,.27,len,x,-.19,0);for(let i=0;i<=Math.floor(len/1.4);i++){const z=-len/2+i*len/Math.floor(len/1.4);box(root,palette.cream,.13,.85,.13,x,.4,z);}
    box(root,palette.brass,.12,.12,len,x,.81,0);for(let i=0;i<Math.floor(len/1.4);i++){const z=-len/2+i*1.4;beam(root,palette.dark,new T.Vector3(x,-.23,z),new T.Vector3(x,-.9,z+.7),.09);beam(root,palette.dark,new T.Vector3(x,-.9,z+.7),new T.Vector3(x,-.23,z+1.4),.09);}}
  return root;
}
export function conveyorModel(a:T.Vector3,b:T.Vector3){const root=new T.Group();const len=a.distanceTo(b);root.position.copy(a).add(b).multiplyScalar(.5);const direction=b.clone().sub(a);root.rotation.set(-Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),Math.atan2(direction.x,direction.z),0,'YXZ');box(root,palette.belt,.52,.09,len,0,0,0,.01);
  for(const x of [-.3,.3])box(root,palette.brass,.07,.13,len,x,.01,0,.01);
  for(let i=0;i<Math.ceil(len/.42);i++){const z=-len/2+(i+.5)*len/Math.ceil(len/.42);const roller=cylinder(root,palette.metal,.075,.075,.56,0,-.04,z,8);roller.rotation.z=Math.PI/2;}
  for(const z of [-len*.38,len*.38])for(const x of [-.23,.23])box(root,palette.dark,.07,.35,.07,x,-.19,z,.01);
  const cargo=sphere(root,palette.rock,.17,0,.21,0);return {root,cargo,len};}
export function droneModel(){const root=new T.Group();box(root,palette.cream,.79,.3,.58,0,0,0,.13);box(root,palette.teal,.43,.18,.4,0,.2,0);const rotors:T.Object3D[]=[];
  for(const x of [-.65,.65])for(const z of [-.47,.47]){beam(root,palette.brass,new T.Vector3(0,0,0),new T.Vector3(x,.05,z),.09);cylinder(root,palette.dark,.12,.12,.2,x,.09,z);const rotor=new T.Group();rotor.position.set(x,.23,z);root.add(rotor);box(rotor,palette.dark,.77,.025,.08);box(rotor,palette.dark,.08,.025,.77);rotors.push(rotor);}
  for(const x of [-.25,.25])beam(root,palette.dark,new T.Vector3(x,-.1,0),new T.Vector3(x,-.53,0),.025);
  const cargo=new T.Group();root.add(cargo);crate(cargo,0,-1.08,0,.62);sphere(root,palette.glow,.07,0,0,.31,1);return {root,rotors,cargo};}
