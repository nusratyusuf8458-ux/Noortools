import {describe,expect,it} from 'vitest'
import {countdownToRamadan,createGoal,DEFAULT_RAMADAN_STATE,upsertJournal,validateRamadanStart} from './ramadan'
describe('Ramadan architecture',()=>{
 it('does not expose countdown for unconfirmed dates',()=>{expect(countdownToRamadan(DEFAULT_RAMADAN_STATE,new Date('2026-09-14T12:00:00Z'))).toBeNull()})
 it('allows a custom or verified start and calculates countdown from it',()=>{const custom=validateRamadanStart({source:'custom',startDate:'2027-02-08',label:''});const c=countdownToRamadan(custom,new Date('2027-02-07T00:00:00Z'));expect(c?.days).toBe(1);expect(c?.started).toBe(false)})
 it('requires a date for verified/custom states',()=>{expect(()=>validateRamadanStart({source:'verified_authority',startDate:null,label:''})).toThrow()})
 it('creates bounded user goals',()=>{const g=createGoal('Quran pages',20,'pages',new Date('2026-09-14T00:00:00Z'));expect(g.label).toBe('Quran pages');expect(g.target).toBe(20)})
 it('stores journal entries as user content and dedupes tags',()=>{const r=upsertJournal({},'2026-09-14','Reflections','calm',['family','family',' ibadah '],new Date('2026-09-14T00:00:00Z'));expect(r['journal:2026-09-14']?.tags).toEqual(['family','ibadah'])})
})
