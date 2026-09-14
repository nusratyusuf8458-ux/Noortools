import type { ZakatInputs, ZakatResult } from './zakat'
import type { FastRecord } from './fasting'
import { DEFAULT_RAMADAN_STATE, type JournalEntry, type RamadanDateState, type RamadanGoal } from './ramadan'
export type StoredZakat={id:string;savedAt:string;input:ZakatInputs;result:Pick<ZakatResult,'zakatableTotal'|'nisabValue'|'qualifies'|'estimatedZakat'>}
export type Phase3BState={version:1;zakatHistory:StoredZakat[];fasting:Record<string,FastRecord>;ramadan:{dateState:RamadanDateState;goals:RamadanGoal[];goalProgress:Record<string,number>;journal:Record<string,JournalEntry>}}
const KEY='noortools:phase3b:v1'
const EMPTY:Phase3BState={version:1,zakatHistory:[],fasting:{},ramadan:{dateState:DEFAULT_RAMADAN_STATE,goals:[],goalProgress:{},journal:{}}}
const clone=()=>structuredClone(EMPTY)
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)
function migrate(raw:unknown):Phase3BState{
 if(!object(raw)||raw.version!==1)return clone()
 const z:Array<StoredZakat>=[];if(Array.isArray(raw.zakatHistory))for(const x of raw.zakatHistory){if(!object(x)||typeof x.id!=='string'||typeof x.savedAt!=='string'||!object(x.input)||!object(x.result))continue;if(!finite(x.result.zakatableTotal)||!finite(x.result.nisabValue)||typeof x.result.qualifies!=='boolean'||!finite(x.result.estimatedZakat))continue;z.push(x as unknown as StoredZakat)}
 const fasting:Record<string,FastRecord>={};if(object(raw.fasting))for(const [k,v] of Object.entries(raw.fasting)){if(!object(v)||typeof v.date!=='string'||typeof v.status!=='string'||!['completed','missed','planned','pending'].includes(v.status)||k!==v.date)continue;fasting[k]={date:v.date,status:v.status as FastRecord['status'],note:typeof v.note==='string'?v.note.slice(0,1000):''}}
 const r=object(raw.ramadan)?raw.ramadan:{};const dateState=object(r.dateState)&&['not_confirmed','calculated_expected','verified_authority','custom'].includes(r.dateState.source)&&((r.dateState.startDate===null)||(typeof r.dateState.startDate==='string'))?r.dateState as RamadanDateState:DEFAULT_RAMADAN_STATE
 const goals:Array<RamadanGoal>=Array.isArray(r.goals)?r.goals.filter((g):g is RamadanGoal=>object(g)&&typeof g.id==='string'&&typeof g.label==='string'&&finite(g.target)&&g.target>0&&typeof g.unit==='string'&&typeof g.createdAt==='string').slice(0,100):[]
 const goalProgress:Record<string,number>={};if(object(r.goalProgress))for(const [id,v] of Object.entries(r.goalProgress))if(finite(v)&&v>=0&&v<=1e12)goalProgress[id]=v
 const journal:Record<string,JournalEntry>={};if(object(r.journal))for(const [id,v] of Object.entries(r.journal))if(object(v)&&typeof v.id==='string'&&typeof v.date==='string'&&typeof v.text==='string'&&typeof v.createdAt==='string'&&typeof v.updatedAt==='string'&&Array.isArray(v.tags))journal[id]={id:v.id,date:v.date,text:v.text.slice(0,5000),mood:typeof v.mood==='string'?v.mood.slice(0,40):'',tags:v.tags.filter((t):t is string=>typeof t==='string').slice(0,12),createdAt:v.createdAt,updatedAt:v.updatedAt}
 return {version:1,zakatHistory:z.slice(-100),fasting,ramadan:{dateState,goals,goalProgress,journal}}
}
export function loadPhase3BState():Phase3BState{try{const raw=localStorage.getItem(KEY);return raw?migrate(JSON.parse(raw)):clone()}catch{return clone()}}
export function savePhase3BState(state:Phase3BState){localStorage.setItem(KEY,JSON.stringify({...state,version:1}))}
export function resetPhase3BState(){localStorage.removeItem(KEY);return clone()}
export function saveZakat(state:Phase3BState,input:ZakatInputs,result:Pick<ZakatResult,'zakatableTotal'|'nisabValue'|'qualifies'|'estimatedZakat'>,now=new Date()):Phase3BState{const id=`zakat:${now.toISOString()}`;return {...state,zakatHistory:[...state.zakatHistory,{id,savedAt:now.toISOString(),input,result}].slice(-100)}}
export function deleteZakat(state:Phase3BState,id:string):Phase3BState{return {...state,zakatHistory:state.zakatHistory.filter(x=>x.id!==id)}}
export function clearZakat(state:Phase3BState):Phase3BState{return {...state,zakatHistory:[]}}
