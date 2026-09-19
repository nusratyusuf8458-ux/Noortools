import {useEffect,useMemo,useState} from 'react'
import {getSteps,sourceStatusLabel,type PilgrimageKind} from './pilgrimage'
import {addChecklist,deleteChecklist,loadPhase3CState,savePhase3CState,toggleChecklist,updateTrack,type Phase3CState} from './pilgrimageStorage'

type Section='hajj'|'umrah'|'checklist'

function Track({kind,state,setState}:{kind:PilgrimageKind;state:Phase3CState;setState:(s:Phase3CState)=>void}){
 const steps=getSteps(kind);const track=state[kind];const current=steps.find(x=>x.id===track.currentStepId)||steps[0];const [note,setNote]=useState(track.notes[current.id]??'')
 useEffect(()=>setNote(track.notes[current.id]??''),[current.id,track.notes])
 const currentIndex=steps.findIndex(x=>x.id===current.id);const progress=track.completedStepIds.length/steps.length
 const selectStep=(id:string)=>setState(updateTrack(state,kind,{currentStepId:id}))
 const toggleStep=()=>setState(updateTrack(state,kind,{completedStepIds:track.completedStepIds.includes(current.id)?track.completedStepIds.filter(x=>x!==current.id):[...track.completedStepIds,current.id]}))
 const saveNote=()=>setState(updateTrack(state,kind,{notes:{...track.notes,[current.id]:note.slice(0,5000)}}))
 return <div className="p3c-layout">
  <aside className="p3c-step-nav" aria-label={`${kind} step navigation`}><p className="eyebrow">PERSONAL PROGRESS</p><div className="p3c-progress"><div style={{width:`${Math.round(progress*100)}%`}}/></div><span>{track.completedStepIds.length}/{steps.length} steps marked by you</span>{steps.map((step,i)=><button key={step.id} className={step.id===current.id?'selected':''} onClick={()=>selectStep(step.id)}><span>{i+1}</span>{step.title}{track.completedStepIds.includes(step.id)&&<b aria-label="Marked complete">✓</b>}</button>)}</aside>
  <section className="p3c-step-card" aria-live="polite"><div className="p3c-kicker">{kind.toUpperCase()} · STEP {currentIndex+1} OF {steps.length}</div><h2>{current.title}</h2><p className="p3c-warning">Religious guidance for this step is <b>unavailable in NoorTools</b> pending exact redistribution clearance and scholarly review. The personal progress control is only a private workflow marker.</p><div className="p3c-source"><div><b>Source status</b><span>{sourceStatusLabel(current.verification)}</span></div><div><b>Review status</b><span>{current.reviewStatus==='not_reviewed'?'Not reviewed':current.reviewStatus}</span></div><div><b>License</b><span>External reference only</span></div><a href={current.source?.url} target="_blank" rel="noreferrer noopener">Open official source ↗</a></div><div className="p3c-actions"><button className="primary" onClick={toggleStep}>{track.completedStepIds.includes(current.id)?'Unmark personal progress':'Mark personal progress'}</button><button disabled={currentIndex===0} onClick={()=>selectStep(steps[Math.max(0,currentIndex-1)].id)}>Previous</button><button disabled={currentIndex===steps.length-1} onClick={()=>selectStep(steps[Math.min(steps.length-1,currentIndex+1)].id)}>Next</button></div><label className="p3c-note">Personal note for this step<textarea value={note} maxLength={5000} onChange={e=>setNote(e.target.value)} placeholder="Private note — USER CONTENT"/><button onClick={saveNote}>Save note locally</button></label></section>
 </div>
}

export default function Phase3CLauncher(){
 const [open,setOpen]=useState(false);const [section,setSection]=useState<Section>('hajj');const [state,setState]=useState<Phase3CState>(loadPhase3CState);const [checkLabel,setCheckLabel]=useState('');const [notice,setNotice]=useState('')
 useEffect(()=>{if(open)savePhase3CState(state)},[state,open])
 const done=useMemo(()=>state.hajj.completedStepIds.length+state.umrah.completedStepIds.length,[state])
 const add=()=>{try{setState(s=>addChecklist(s,checkLabel));setCheckLabel('');setNotice('Personal checklist item saved locally.')}catch(e){setNotice(e instanceof Error?e.message:'Could not add checklist item.')}}
 return <>
  <button className="phase3c-launcher" onClick={()=>setOpen(true)} aria-label="Open Hajj and Umrah">Hajj · Umrah</button>
  {open&&<div className="phase3c-overlay" role="dialog" aria-modal="true" aria-label="Hajj and Umrah companion"><section className="page phase3c-page">
   <div className="back"><button onClick={()=>setOpen(false)} aria-label="Close Hajj and Umrah">←</button><div><h1>Hajj · Umrah Foundation</h1></div></div>
   <div className="content-tabs" role="tablist" aria-label="Hajj and Umrah sections">{(['hajj','umrah','checklist'] as Section[]).map(x=><button key={x} role="tab" aria-selected={section===x} className={section===x?'selected':''} onClick={()=>setSection(x)}>{x==='hajj'?'Hajj':x==='umrah'?'Umrah':'My Checklist'}</button>)}</div>
   <div className="p3c-honesty"><b>Accuracy boundary:</b> religious instruction is intentionally unavailable until source rights and scholarly review are established. {done>0&&<span>{done} personal step{done===1?'':'s'} marked across both modules.</span>}</div>
   {notice&&<div className="experience-toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice">×</button></div>}
   {section!=='checklist'?<Track kind={section} state={state} setState={setState}/>:<div className="p3c-checklist"><div className="card"><p className="eyebrow">USER CONTENT</p><h2>Private travel checklist</h2><p className="muted">Personal reminders only; these are not religious requirements.</p><div className="row"><label className="grow">New item<input maxLength={240} value={checkLabel} onChange={e=>setCheckLabel(e.target.value)} placeholder="Passport, clothing, transport…"/></label><button className="primary" onClick={add}>Add item</button></div></div><div className="card">{state.checklist.length===0?<p className="muted">No checklist items yet.</p>:state.checklist.map(item=><div className="p3c-check-row" key={item.id}><label><input type="checkbox" checked={item.done} onChange={()=>setState(toggleChecklist(state,item.id))}/><span className={item.done?'done':''}>{item.label}</span></label><button onClick={()=>setState(deleteChecklist(state,item.id))} aria-label={`Delete ${item.label}`}>Delete</button></div>)}</div><div className="card"><p className="eyebrow">OFFLINE</p><p>Your personal checklist and notes are stored locally. No religious content is downloaded for this module.</p><p className="footnote">USER CONTENT is kept separate from religious source content.</p></div></div>}
   <p className="footnote">Source status: official Ministry/Nusuk pages are external references only. No Ministry/Nusuk text, images, Talbiyah, Dua, Hadith or fiqh rulings are redistributed here. Scholar review is not claimed.</p>
  </section></div>}
 </>
}
