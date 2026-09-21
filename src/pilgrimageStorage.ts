import {getSteps,type PilgrimageKind} from './pilgrimage'
import {preserveCorruptStorage} from './storageRecovery'
export type PersonalChecklistItem={id:string;label:string;done:boolean;createdAt:string}
export type PilgrimageTrack={currentStepId:string|null;completedStepIds:string[];notes:Record<string,string>}
export type Phase3CState={version:1;hajj:PilgrimageTrack;umrah:PilgrimageTrack;checklist:PersonalChecklistItem[]}
const KEY='noortools:phase3c:v1'
const blank=():Phase3CState=>({version:1,hajj:{currentStepId:null,completedStepIds:[],notes:{}},umrah:{currentStepId:null,completedStepIds:[],notes:{}},checklist:[]})
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
const cleanString=(v:unknown,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max):''
function cleanTrack(raw:unknown,kind:PilgrimageKind):PilgrimageTrack{const steps=new Set(getSteps(kind).map(x=>x.id));if(!object(raw))return {currentStepId:null,completedStepIds:[],notes:{}};const current=typeof raw.currentStepId==='string'&&steps.has(raw.currentStepId)?raw.currentStepId:null;const completed=Array.isArray(raw.completedStepIds)?Array.from(new Set(raw.completedStepIds.filter((x):x is string=>typeof x==='string'&&steps.has(x)))):[];const notes:Record<string,string>={};if(object(raw.notes))for(const [id,v] of Object.entries(raw.notes))if(steps.has(id)){const note=cleanString(v,5000);if(note)notes[id]=note}return {currentStepId:current,completedStepIds:completed,notes}}
function migrate(raw:unknown):Phase3CState{if(!object(raw)||raw.version!==1)throw new Error('Stored Hajj/Umrah data uses an unsupported version or invalid structure.');const checklist:Array<PersonalChecklistItem>=[];if(Array.isArray(raw.checklist))for(const x of raw.checklist){if(!object(x)||typeof x.id!=='string'||typeof x.done!=='boolean'||typeof x.createdAt!=='string')continue;const label=cleanString(x.label,240).trim();if(label)checklist.push({id:x.id.slice(0,120),label,done:x.done,createdAt:x.createdAt})}return {version:1,hajj:cleanTrack(raw.hajj,'hajj'),umrah:cleanTrack(raw.umrah,'umrah'),checklist:checklist.slice(-200)}}
export const loadPhase3CState=():Phase3CState=>{try{const raw=localStorage.getItem(KEY);if(!raw)return blank();try{return migrate(JSON.parse(raw))}catch(error){preserveCorruptStorage(KEY,raw,error instanceof Error?error.message:'Stored Hajj/Umrah data could not be migrated safely.')}}catch{}return blank()}
export const savePhase3CState=(state:Phase3CState)=>{localStorage.setItem(KEY,JSON.stringify({...state,version:1}))}
export const resetPhase3CState=()=>{localStorage.removeItem(KEY);localStorage.removeItem(`${KEY}:recovery:v1`);return blank()}
export const updateTrack=(state:Phase3CState,kind:PilgrimageKind,patch:Partial<PilgrimageTrack>):Phase3CState=>({...state,[kind]:{...state[kind],...patch}})
const newId=(now:Date)=>`item:${now.toISOString()}:${typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():now.getTime().toString(36)}`
export const addChecklist=(state:Phase3CState,label:string,now=new Date()):Phase3CState=>{const clean=cleanString(label,240).trim();if(!clean)throw new Error('Checklist label is required.');return {...state,checklist:[...state.checklist,{id:newId(now),label:clean,done:false,createdAt:now.toISOString()}].slice(-200)}}
export const toggleChecklist=(state:Phase3CState,id:string):Phase3CState=>({...state,checklist:state.checklist.map(x=>x.id===id?{...x,done:!x.done}:x)})
export const deleteChecklist=(state:Phase3CState,id:string):Phase3CState=>({...state,checklist:state.checklist.filter(x=>x.id!==id)})
