import {describe,expect,it} from 'vitest'
import {calculateZakat,COMMON_NISAB,COMMON_ZAKAT_RATE} from './zakat'
const base={currency:'INR',cash:100000,bankSavings:200000,goldGrams:10,goldPricePerGram:7000,silverGrams:100,silverPricePerGram:100,investments:50000,businessInventory:0,receivables:0,otherEligibleAssets:0,eligibleDeductions:0,nisabMethod:'silver' as const,goldNisabGrams:COMMON_NISAB.goldGrams,silverNisabGrams:COMMON_NISAB.silverGrams,zakatRate:COMMON_ZAKAT_RATE}
describe('zakat calculation',()=>{
 it('values all declared asset classes and applies explicit deductions',()=>{const r=calculateZakat({...base,eligibleDeductions:25000});expect(r.grossAssets).toBe(430000);expect(r.zakatableTotal).toBe(405000);expect(r.estimatedZakat).toBe(10125)})
 it('uses selected gold or silver nisab price without hiding the assumption',()=>{const gold=calculateZakat({...base,goldGrams:100,goldPricePerGram:7000,nisabMethod:'gold'});expect(gold.nisabValue).toBe(612360);const silver=calculateZakat({...base,nisabMethod:'silver'});expect(silver.nisabValue).toBe(61236)})
 it('does not deduct nisab from the zakatable total',()=>{const r=calculateZakat({...base,cash:100000,goldGrams:0,silverGrams:0,investments:0,bankSavings:250000,eligibleDeductions:0,nisabMethod:'gold',goldPricePerGram:7000});expect(r.zakatableTotal).toBe(350000);expect(r.estimatedZakat).toBe(0)})
 it('rounds monetary output to two decimals',()=>{const r=calculateZakat({...base,cash:1000.555,bankSavings:0,goldGrams:0,silverGrams:0,investments:0,zakatRate:0.025});expect(r.grossAssets).toBe(1000.56)})
 it('rejects invalid and missing manual prices',()=>{expect(()=>calculateZakat({...base,cash:-1})).toThrow();expect(()=>calculateZakat({...base,goldGrams:2,goldPricePerGram:0})).toThrow();expect(()=>calculateZakat({...base,zakatRate:2})).toThrow()})
 it('does not claim a payable amount when the selected nisab is not reached',()=>{const r=calculateZakat({...base,cash:10,bankSavings:0,goldGrams:0,silverGrams:0,investments:0});expect(r.qualifies).toBe(false);expect(r.estimatedZakat).toBe(0)})
})
