import {describe,expect,it} from 'vitest'
import {fastingHistory,fastingStats,setFastRecord} from './fasting'
describe('fasting tracker',()=>{
 it('creates genuine date records for all supported states',()=>{let r={};r=setFastRecord(r,'2026-09-14','completed');r=setFastRecord(r,'2026-09-15','missed','Travel');r=setFastRecord(r,'2026-09-16','planned');expect(fastingStats(r)).toEqual({completed:1,missed:1,planned:1,total:3})})
 it('rejects malformed dates and preserves notes without fabricating state',()=>{expect(()=>setFastRecord({},'2026-02-30','completed')).toThrow();const r=setFastRecord({},'2026-09-14','completed','  genuine note  ');expect(r['2026-09-14']?.note).toBe('genuine note')})
 it('sorts history newest first',()=>{let r={};r=setFastRecord(r,'2026-09-01','completed');r=setFastRecord(r,'2026-09-03','missed');expect(fastingHistory(r).map(x=>x.date)).toEqual(['2026-09-03','2026-09-01'])})
})
