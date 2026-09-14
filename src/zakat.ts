export type NisabMethod = 'gold' | 'silver'
export type ZakatInputs = { currency:string; cash:number; bankSavings:number; goldGrams:number; goldPricePerGram:number; silverGrams:number; silverPricePerGram:number; investments:number; businessInventory:number; receivables:number; otherEligibleAssets:number; eligibleDeductions:number; nisabMethod:NisabMethod; goldNisabGrams:number; silverNisabGrams:number; zakatRate:number }
export type ZakatResult = ZakatInputs & { preciousMetalValues:{gold:number; silver:number}; grossAssets:number; deductionsApplied:number; zakatableTotal:number; nisabValue:number; qualifies:boolean; estimatedZakat:number }
export const COMMON_NISAB={goldGrams:87.48,silverGrams:612.36}
export const COMMON_ZAKAT_RATE=0.025
const LIMIT=1e15
const finiteNonNegative=(v:number,label:string)=>{if(!Number.isFinite(v)||v<0||v>LIMIT)throw new Error(`${label} must be a finite, non-negative number.`);return v}
const roundMoney=(v:number)=>Math.round((v+Number.EPSILON)*100)/100
export function calculateZakat(i:ZakatInputs):ZakatResult{
 for(const [key,label] of [['cash','Cash'],['bankSavings','Bank savings'],['goldGrams','Gold weight'],['goldPricePerGram','Gold price'],['silverGrams','Silver weight'],['silverPricePerGram','Silver price'],['investments','Investments'],['businessInventory','Business inventory'],['receivables','Receivables'],['otherEligibleAssets','Other eligible assets'],['eligibleDeductions','Eligible deductions'],['goldNisabGrams','Gold nisab grams'],['silverNisabGrams','Silver nisab grams'],['zakatRate','Zakat rate']] as [keyof ZakatInputs,string][]) finiteNonNegative(i[key] as number,label)
 if(i.goldNisabGrams<=0||i.silverNisabGrams<=0)throw new Error('Nisab gram thresholds must be greater than zero.')
 if(i.zakatRate>1)throw new Error('Zakat rate must be expressed as a decimal between 0 and 1.')
 if(i.goldGrams>0&&i.goldPricePerGram===0)throw new Error('Enter a gold price when gold weight is provided.')
 if(i.silverGrams>0&&i.silverPricePerGram===0)throw new Error('Enter a silver price when silver weight is provided.')
 if(!i.currency.trim())throw new Error('Currency is required.')
 if(i.nisabMethod!=='gold'&&i.nisabMethod!=='silver')throw new Error('Select a nisab method.')
 const gold=i.goldGrams*i.goldPricePerGram,silver=i.silverGrams*i.silverPricePerGram
 const gross=i.cash+i.bankSavings+gold+silver+i.investments+i.businessInventory+i.receivables+i.otherEligibleAssets
 const deductions=Math.min(i.eligibleDeductions,gross), taxable=Math.max(0,gross-deductions)
 const nisab=(i.nisabMethod==='gold'?i.goldNisabGrams*i.goldPricePerGram:i.silverNisabGrams*i.silverPricePerGram)
 const qualifies=nisab>0&&taxable>=nisab
 return {...i,preciousMetalValues:{gold:roundMoney(gold),silver:roundMoney(silver)},grossAssets:roundMoney(gross),deductionsApplied:roundMoney(deductions),zakatableTotal:roundMoney(taxable),nisabValue:roundMoney(nisab),qualifies,estimatedZakat:qualifies?roundMoney(taxable*i.zakatRate):0}
}
