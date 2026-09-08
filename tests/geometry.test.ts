import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {bridgeModel,conveyorModel} from '../src/models';
test('bridges and conveyors keep their decks upright in every compass direction',()=>{
  for(const end of [new Vector3(12,1,0),new Vector3(-4,1.5,-19),new Vector3(0,1,-12),new Vector3(-8,0,3)]){
    const origin=new Vector3();for(const model of [bridgeModel(origin,end),conveyorModel(origin,end).root]){
      const up=new Vector3(0,1,0).applyEuler(model.rotation);
      const forward=new Vector3(0,0,1).applyEuler(model.rotation);
      assert.ok(up.y>.98,'Deck must not roll over for northbound routes');
      assert.ok(forward.distanceTo(end.clone().normalize())<1e-6,'Span must reach its endpoints');
    }
  }
});
