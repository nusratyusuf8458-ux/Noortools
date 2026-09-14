import {describe,expect,it} from 'vitest'
import {HAJJ_STEPS,UMRAH_STEPS,getSteps,isValidStepId,sourceStatusLabel} from './pilgrimage'
describe('pilgrimage source-gated content model',()=>{
 it('exposes the requested Hajj and Umrah step architecture without religious instructions',()=>{expect(HAJJ_STEPS.map(x=>x.title)).toEqual(['Overview','Preparation','Ihram','Miqat','Tawaf','Sa’i','Mina','Arafat','Muzdalifah','Jamarat','Qurbani','Tawaf al-Ifadah','Farewell Tawaf','Post-Hajj checklist']);expect(UMRAH_STEPS.map(x=>x.title)).toEqual(['Preparation','Ihram','Miqat','Tawaf','Sa’i','Hair-cut / completion','Checklist']);expect(HAJJ_STEPS.every(x=>x.verification==='unavailable')).toBe(true)})
 it('keeps source metadata external-reference-only and never claims scholar review',()=>{const step=getSteps('umrah')[0];expect(step.source?.publisher).toContain('Ministry');expect(step.source?.licenseStatus).toBe('external_reference_only');expect(step.reviewStatus).toBe('not_reviewed');expect(step.reason).toMatch(/not bundled/i)})
 it('validates only known navigation step ids and exposes honest labels',()=>{expect(isValidStepId('hajj','hajj-1')).toBe(true);expect(isValidStepId('hajj','hajj-999')).toBe(false);expect(sourceStatusLabel('unavailable')).toBe('Unavailable')})
})
