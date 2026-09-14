export type VerificationStatus='source_verified'|'pending_scholar_review'|'scholar_reviewed'|'needs_correction'|'unavailable'
export type PilgrimageKind='hajj'|'umrah'
export type PilgrimageStep={id:string;title:string;kind:PilgrimageKind;order:number;verification:VerificationStatus;reviewStatus:'not_reviewed'|'pending'|'reviewed';source?:{publisher:string;title:string;version:string;url:string;licenseStatus:'external_reference_only'|'redistribution_cleared'};reason?:string}

const OFFICIAL_UMRAH={publisher:'Saudi Ministry of Hajj and Umrah',title:'A Comprehensive Guide to Umrah',version:'published guide; current web copy may change',url:'https://haj.gov.sa/-/media/Project/HAJJ/PDF-and-FILES/umrah-hero-guide/EN-Umrah-Guide.pdf'}
const OFFICIAL_RULES={publisher:'Saudi Ministry of Hajj and Umrah',title:'Regulations and Rules',version:'official web collection; current version may change',url:'https://haj.gov.sa/en/About-the-ministry/Regulations-and-Rules'}
const UNAVAILABLE_REASON='Religious guidance is not bundled because an exact redistribution grant and independent scholarly review for NoorTools has not been established.'
const hajjTitles=['Overview','Preparation','Ihram','Miqat','Tawaf','Sa’i','Mina','Arafat','Muzdalifah','Jamarat','Qurbani','Tawaf al-Ifadah','Farewell Tawaf','Post-Hajj checklist'] as const
const umrahTitles=['Preparation','Ihram','Miqat','Tawaf','Sa’i','Hair-cut / completion','Checklist'] as const
function build(kind:PilgrimageKind,titles:readonly string[],source:typeof OFFICIAL_RULES|typeof OFFICIAL_UMRAH):PilgrimageStep[]{return titles.map((title,order)=>({id:`${kind}-${order+1}`,title,kind,order,verification:'unavailable',reviewStatus:'not_reviewed',source:{...source,licenseStatus:'external_reference_only'},reason:UNAVAILABLE_REASON}))}
export const HAJJ_STEPS=build('hajj',hajjTitles,OFFICIAL_RULES)
export const UMRAH_STEPS=build('umrah',umrahTitles,OFFICIAL_UMRAH)
export const getSteps=(kind:PilgrimageKind)=>kind==='hajj'?HAJJ_STEPS:UMRAH_STEPS
export const sourceStatusLabel=(status:VerificationStatus)=>({source_verified:'Source verified',pending_scholar_review:'Pending scholar review',scholar_reviewed:'Scholar reviewed',needs_correction:'Needs correction',unavailable:'Unavailable'}[status])
export const isValidStepId=(kind:PilgrimageKind,id:string)=>getSteps(kind).some(step=>step.id===id)
