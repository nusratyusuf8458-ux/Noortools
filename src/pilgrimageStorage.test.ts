import {describe,expect,it} from 'vitest'
import {addChecklist,deleteChecklist,loadPhase3CState,toggleChecklist,updateTrack,type Phase3CState} from './pilgrimageStorage'
const empty:Phase3CState={version:1,hajj:{currentStepId:null,completedStepIds:[],notes:{}},umrah:{currentStepId:null,completedStepIds:[],notes:{}},checklist:[]}
describe('phase 3c private storage',()=>{
 it('starts empty and does not seed progress',()=>{localStorage.clear();expect(loadPhase3CState()).toEqual(empty)})
 it('updates resume/current step and completion state without inferring obligation completion',()=>{const a=updateTrack(empty,'hajj',{currentStepId:'hajj-3',completedStepIds:['hajj-1']});expect(a.hajj.currentStepId).toBe('hajj-3');expect(a.hajj.completedStepIds).toEqual(['hajj-1']);expect(a.umrah.completedStepIds).toEqual([])})
 it('supports private checklist create, toggle and delete',()=>{const a=addChecklist(empty,'Passport');expect(a.checklist[0].done).toBe(false);const b=toggleChecklist(a,a.checklist[0].id);expect(b.checklist[0].done).toBe(true);const c=deleteChecklist(b,b.checklist[0].id);expect(c.checklist).toEqual([])})
 it('migrates malformed saved data to safe bounded state',()=>{localStorage.setItem('noortools:phase3c:v1',JSON.stringify({version:1,checklist:[{id:'1',label:'\u0000passport',done:true,createdAt:'x'},{id:'2',label:'',done:true,createdAt:'x'}],hajj:{currentStepId:'bad',completedStepIds:['hajj-1','bad'],notes:{'hajj-1':'ok'}},umrah:{currentStepId:'umrah-2',completedStepIds:['umrah-2'],notes:{'umrah-2':'ok'}}}));const s=loadPhase3CState();expect(s.checklist).toHaveLength(1);expect(s.checklist[0].label).toBe('passport');expect(s.hajj.currentStepId).toBeNull();expect(s.hajj.completedStepIds).toEqual(['hajj-1'])})
})
