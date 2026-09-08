import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BALANCE, ISLANDS, type BuildingType } from './config';
import { placementReason, type GameState } from './simulation';
import { animateModel, box, bridgeModel, buildingModel, conveyorModel, disposeModel, droneModel, islandModel, palette, seeded, type Model } from './models';
export type Hit={kind:'building';id:number}|{kind:'deposit';island:number}|{kind:'pad';island:number;pad:number}|{kind:'island';island:number};
export class World {
  scene=new T.Scene();camera=new T.PerspectiveCamera(38,1,.1,170);renderer:T.WebGLRenderer;controls:OrbitControls;
  models=new Map<number,Model>();private targets:T.Object3D[]=[];private dynamic=new T.Group();private signature='';private ray=new T.Raycaster();private pointer=new T.Vector2();private down={x:0,y:0};private dragged=false;private pointerDown=false;private clouds=new T.Group();private keys=new Set<string>();private elapsed=0;
  private belts:{root:T.Group;cargo:T.Mesh;len:number;source:number}[]=[];private drones=new Map<number,ReturnType<typeof droneModel>>();private pads=new Map<string,T.Mesh>();
  private preview:Model|null=null;private previewType:BuildingType|null=null;private hover:Hit|null=null;private selection=new T.Group();private focusTo:T.Vector3|null=null;
  onHit:(hit:Hit|null)=>void=()=>{};onHover:(hit:Hit|null)=>void=()=>{};
  constructor(container:HTMLElement){
    this.scene.background=new T.Color('#a9d5d7');this.scene.fog=new T.Fog('#b8dbd9',52,115);
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;container.append(this.renderer.domElement);
    this.camera.position.set(23,25,32);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(-1,0,-2);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=12;this.controls.maxDistance=65;this.controls.maxPolarAngle=Math.PI*.46;this.controls.minPolarAngle=.25;this.controls.enablePan=true;this.controls.panSpeed=.65;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.75;
    const ambient=new T.HemisphereLight(0xe7faf5,0x758d83,1.8);this.scene.add(ambient);
    const sun=new T.DirectionalLight(0xffe3b0,3.5);sun.position.set(-18,32,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:90});sun.shadow.bias=-.0007;sun.shadow.normalBias=.04;sun.shadow.radius=3;this.scene.add(sun);
    const fill=new T.DirectionalLight(0xb4e4ed,1.1);fill.position.set(18,12,-20);this.scene.add(fill);
    for(const spec of ISLANDS){const land=islandModel(spec);this.scene.add(land);
      this.target({kind:'deposit',island:spec.id},new T.Vector3(spec.x+spec.deposit[0],spec.y+.6,spec.z+spec.deposit[1]),new T.Vector3(2,1.6,2));
      spec.pads.forEach(([x,z],pad)=>{const tile=box(this.scene,new T.MeshStandardMaterial({color:0xe2ddb2,roughness:1,transparent:true,opacity:.35}),2.5,.03,2.5,spec.x+x,spec.y+.028,spec.z+z,.15);this.pads.set(`${spec.id}:${pad}`,tile);this.target({kind:'pad',island:spec.id,pad},new T.Vector3(spec.x+x,spec.y+.06,spec.z+z),new T.Vector3(2.65,.1,2.65));});
    }
    this.scene.add(this.dynamic);this.scene.add(this.clouds);const rand=seeded(24);const cloudMat=new T.MeshStandardMaterial({color:0xf5faf0,roughness:1,transparent:true,opacity:.88,depthWrite:false});const cloudGeo=new T.IcosahedronGeometry(1,2);const instances=new T.InstancedMesh(cloudGeo,cloudMat,150);const transform=new T.Object3D();
    for(let i=0;i<150;i++){const cluster=Math.floor(i/5);const r=seeded(cluster*133+19);const cx=(r()-.5)*110,cz=(r()-.5)*90,cy=-10-r()*6;transform.position.set(cx+rand()*5,cy+rand()*.55,cz+rand()*3);transform.scale.set(2+rand()*2,1+rand()*.8,1.8+rand()*1.6);transform.updateMatrix();instances.setMatrixAt(i,transform.matrix);}this.clouds.add(instances);
    const ring=new T.Mesh(new T.RingGeometry(1.57,1.63,48),new T.MeshBasicMaterial({color:0xffdf8e,side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;this.selection.add(ring);this.selection.visible=false;this.scene.add(this.selection);
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};this.dragged=false;this.pointerDown=true;this.focusTo=null;});
    canvas.addEventListener('pointerup',e=>{this.pointerDown=false;if(e.button===0&&!this.dragged&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<6)this.onHit(this.pick(e.clientX,e.clientY));});
    canvas.addEventListener('pointermove',e=>{if(this.pointerDown&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>=6)this.dragged=true;this.hover=this.pick(e.clientX,e.clientY);canvas.style.cursor=this.hover?'pointer':'grab';this.onHover(this.hover);});
    canvas.addEventListener('pointerleave',()=>{this.hover=null;});
    window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||(e.target as HTMLElement).matches('input,select,textarea'))return;this.keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>this.keys.clear());
    window.addEventListener('resize',()=>this.resize());this.resize();
  }
  private target(hit:Hit,pos:T.Vector3,size:T.Vector3,parent:T.Object3D=this.scene){const o=new T.Mesh(new T.BoxGeometry(size.x,size.y,size.z),new T.MeshBasicMaterial({visible:false}));o.position.copy(pos);o.userData.hit=hit;parent.add(o);this.targets.push(o);}
  private pick(x:number,y:number):Hit|null{const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.targets,false);return hits[0]?.object.userData.hit??null;}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  position(island:number,pad:number){const s=ISLANDS[island],p=pad<0?[-3,-1.5]:s.pads[pad];return new T.Vector3(s.x+p[0],s.y+.1,s.z+p[1]);}
  focus(island:number){const s=ISLANDS[island];this.focusTo=new T.Vector3(s.x,s.y,s.z);}
  home(){this.focusTo=new T.Vector3(-1,0,-2);this.camera.position.copy(this.controls.target).add(new T.Vector3(24,25,34));}
  project(point:T.Vector3){const p=point.clone().project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,visible:p.z<1&&p.x>-1&&p.x<1&&p.y>-1&&p.y<1};}
  setPlacement(type:BuildingType|null){if(type===this.previewType)return;if(this.preview){this.scene.remove(this.preview.root);this.preview.root.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).dispose();});disposeModel(this.preview);}this.previewType=type;this.preview=null;
    if(type){this.preview=buildingModel(type);this.preview.root.traverse(o=>{if(o instanceof T.Mesh){o.material=(o.material as T.Material).clone();(o.material as T.MeshStandardMaterial).transparent=true;(o.material as T.MeshStandardMaterial).opacity=.42;o.castShadow=false;}});this.scene.add(this.preview.root);}
  }
  sync(s:GameState){const key=s.buildings.map(b=>`${b.id}:${b.type}:${b.island}:${b.pad}:${b.level}`).join(',')+'|'+s.islands.map(i=>i.unlocked).join(',')+'|'+s.routes.map(r=>r.id).join(',');if(key===this.signature)return;this.signature=key;
    this.targets=this.targets.filter(o=>{if(o.userData.hit.kind==='building'){if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}return false;}return true;});
    for(const m of this.models.values())disposeModel(m);this.models.clear();this.dynamic.clear();this.belts=[];this.drones.clear();
    for(const b of s.buildings){const model=buildingModel(b.type,b.level);model.root.position.copy(this.position(b.island,b.pad));this.dynamic.add(model.root);this.models.set(b.id,model);this.target({kind:'building',id:b.id},model.root.position.clone().add(new T.Vector3(0,b.type==='beacon'?2.4:1.3,0)),new T.Vector3(2.7,b.type==='beacon'?5:2.8,2.7),this.dynamic);}
    for(const island of ISLANDS.slice(1)){if(!s.islands[island.id].unlocked)continue;const origin=ISLANDS[0];const a=new T.Vector3(origin.x,origin.y,origin.z);const b=new T.Vector3(island.x,island.y,island.z);const direction=b.clone().sub(a);direction.y=0;direction.normalize();a.addScaledVector(direction,origin.radius*.84);b.addScaledVector(direction,-island.radius*.84);a.y+=.12;b.y+=.12;this.dynamic.add(bridgeModel(a,b));}
    for(const b of s.buildings){const targetType=b.type==='drill'?'smelter':b.type==='smelter'?'workshop':null;if(!targetType)continue;const candidates=s.buildings.filter(v=>v.island===b.island&&v.type===targetType);candidates.sort((a,c)=>this.position(a.island,a.pad).distanceTo(this.position(b.island,b.pad))-this.position(c.island,c.pad).distanceTo(this.position(b.island,b.pad)));const target=candidates[0];if(!target)continue;
      const a=this.position(b.island,b.pad).add(new T.Vector3(0,.35,1.12)),z=this.position(target.island,target.pad).add(new T.Vector3(0,.35,1.12));const dir=z.clone().sub(a).normalize();a.addScaledVector(dir,1.22);z.addScaledVector(dir,-1.22);if(a.distanceTo(z)<.15)continue;const belt=conveyorModel(a,z);this.dynamic.add(belt.root);this.belts.push({...belt,source:b.id});}
    for(const r of s.routes){const drone=droneModel();this.dynamic.add(drone.root);this.drones.set(r.id,drone);}
  }
  update(s:GameState,dt:number,selected:number|null,placement:BuildingType|null,affordable:boolean){this.elapsed+=dt;this.sync(s);this.setPlacement(placement);
    const panSpeed=dt*this.camera.position.distanceTo(this.controls.target)*.28;const move=new T.Vector3();const forward=this.controls.target.clone().sub(this.camera.position);forward.y=0;forward.normalize();const right=forward.clone().cross(new T.Vector3(0,1,0));if(this.keys.has('w')||this.keys.has('arrowup'))move.add(forward);if(this.keys.has('s')||this.keys.has('arrowdown'))move.sub(forward);if(this.keys.has('a')||this.keys.has('arrowleft'))move.sub(right);if(this.keys.has('d')||this.keys.has('arrowright'))move.add(right);if(move.lengthSq()){move.normalize().multiplyScalar(panSpeed);this.camera.position.add(move);this.controls.target.add(move);this.focusTo=null;}
    if(this.focusTo){const delta=this.focusTo.clone().sub(this.controls.target).multiplyScalar(Math.min(1,dt*5));this.controls.target.add(delta);this.camera.position.add(delta);if(delta.length()<.005)this.focusTo=null;}this.controls.update();
    for(const b of s.buildings){const m=this.models.get(b.id)!;animateModel(m,this.elapsed,b.active,dt);}
    for(const belt of this.belts){const b=s.buildings.find(b=>b.id===belt.source)!;belt.cargo.visible=b.active;belt.cargo.position.z=((this.elapsed*.45)%1-.5)*belt.len;}
    this.clouds.position.x=Math.sin(this.elapsed*.015)*3;
    for(const r of s.routes){const d=this.drones.get(r.id)!;const sb=s.buildings.find(b=>b.island===r.source&&b.type==='dock'),tb=s.buildings.find(b=>b.island===r.target&&b.type==='dock');if(!sb||!tb)continue;const a=this.position(sb.island,sb.pad).add(new T.Vector3(0,2.3,0)),b=this.position(tb.island,tb.pad).add(new T.Vector3(0,2.3,0));const f=r.phase==='waiting'?0:Math.min(r.elapsed/BALANCE.flightSeconds,1);const t=r.phase==='returning'?1-f:f;d.root.position.lerpVectors(a,b,t);d.root.position.y+=Math.sin(t*Math.PI)*3.5+Math.sin(this.elapsed*3)*.05;d.root.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)+(r.phase==='returning'?Math.PI:0);d.rotors.forEach(p=>p.rotation.y+=dt*(r.phase==='waiting'?4:38));d.cargo.visible=r.cargo>0;}
    for(const [key,pad] of this.pads){const [island,index]=key.split(':').map(Number);const occupied=s.buildings.some(b=>b.island===island&&b.pad===index);const available=placement?!placementReason(s,placement,island,index):s.islands[island].unlocked&&!occupied;pad.visible=!occupied;const mat=pad.material as T.MeshStandardMaterial;mat.opacity=placement?(available?.8:.5):.16;mat.color.set(placement?(available&&affordable?0xbaf5ba:0xd68570):0xe8e4ba);}
    if(this.preview){const h=this.hover;this.preview.root.visible=h?.kind==='pad';if(h?.kind==='pad'){this.preview.root.position.copy(this.position(h.island,h.pad));const valid=!!placement&&!placementReason(s,placement,h.island,h.pad);this.preview.root.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshStandardMaterial).color.set(valid?0x9cdda1:0xde7770);});}}
    const chosen=s.buildings.find(b=>b.id===selected);this.selection.visible=!!chosen;if(chosen)this.selection.position.copy(this.position(chosen.island,chosen.pad)).add(new T.Vector3(0,.09,0));
    this.renderer.render(this.scene,this.camera);
  }
}
