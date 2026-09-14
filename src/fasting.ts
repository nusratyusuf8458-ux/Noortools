export type FastStatus='completed'|'missed'|'planned'|'pending'
export type FastRecord={date:string;status:FastStatus;note?:string}
const DATE=/^\d{4}-\d{2}-\d{2}$/
export function validFastStatus(v:unknown):v is FastStatus{return v==='completed'||v==='missed'||v==='planned'||v==='pending'}
export function setFastRecord(records:Record<string,FastRecord>,date:string,status:FastStatus,note=''){if(!DATE.test(date))throw new Error('Date must use YYYY-MM-DD.');if(!validFastStatus(status))throw new Error('Invalid fasting status.');if(new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)throw new Error('Invalid calendar date.');const next={...records};next[date]={date,status,note:note.trim().slice(0,1000)};return next}
export function removeFastRecord(records:Record<string,FastRecord>,date:string){const next={...records};delete next[date];return next}
export function fastingStats(records:Record<string,FastRecord>){const values=Object.values(records);return {completed:values.filter(v=>v.status==='completed').length,missed:values.filter(v=>v.status==='missed').length,planned:values.filter(v=>v.status==='planned'||v.status==='pending').length,total:values.length}}
export function fastingHistory(records:Record<string,FastRecord>):FastRecord[]{return Object.values(records).sort((a,b)=>b.date.localeCompare(a.date))}
