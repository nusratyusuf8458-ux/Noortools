import {describe,expect,it,beforeEach} from 'vitest'
import {calculateZakat,COMMON_NISAB,COMMON_ZAKAT_RATE} from './zakat'
import {loadPhase3BState,resetPhase3BState,savePhase3BState,saveZakat} from './phase3bStorage'
beforeEach(()=>localStorage.clear())
describe('Phase 3B storage',()=>{
 it('starts empty and persists versioned data locally',()=>{const s=loadPhase3BState();expect(s.version).toBe(1);savePhase3BState({...s,ramadan:{...s.ramadan,dateState:{source:'custom',startDate:'2027-02-08',label:'Custom Ramadan start'}}});expect(loadPhase3BState().ramadan.dateState.startDate).toBe('2027-02-08')})
 it('saves capped zakat history without storing unnecessary identity data',()=>{const s=loadPhase3BState();const input={currency:'INR',cash:100000,bankSavings:0,goldGrams:0,goldPricePerGram:0,silverGrams:0,silverPricePerGram:0,investments:0,businessInventory:0,receivables:0,otherEligibleAssets:0,eligibleDeductions:0,nisabMethod:'gold' as const,goldNisabGrams:COMMON_NISAB.goldGrams,silverNisabGrams:COMMON_NISAB.silverGrams,zakatRate:COMMON_ZAKAT_RATE};const result=calculateZakat(input);const n=saveZakat(s,input,result,new Date('2026-09-14T00:00:00Z'));expect(n.zakatHistory).toHaveLength(1);expect((n.zakatHistory[0] as any).name).toBeUndefined()})
 it('recovers safely from hostile JSON and supports reset',()=>{localStorage.setItem('noortools:phase3b:v1','{"version":1,"fasting":null,"zakatHistory":[{"bad":true}]}');expect(loadPhase3BState().zakatHistory).toEqual([]);resetPhase3BState();expect(localStorage.getItem('noortools:phase3b:v1')).toBeNull()})
})
