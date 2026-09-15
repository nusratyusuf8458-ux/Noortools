export type SearchContentType = 'quran' | 'names' | 'duas' | 'azkar' | 'learning'
export type SearchFilter = 'all' | SearchContentType
export function normalizeSearchText(value:string):string{return value.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[ٱأإآ]/g,'ا').toLocaleLowerCase()}
export function searchMatches(value:string,query:string):boolean{const needle=normalizeSearchText(query.trim());return Boolean(needle)&&normalizeSearchText(value).includes(needle)}
export function filterSearchResults<T extends{type:SearchContentType}>(results:T[],filter:SearchFilter):T[]{return filter==='all'?results:results.filter(result=>result.type===filter)}
export function searchEmptyState(query:string,resultCount:number):'idle'|'results'|'no-results'{if(!query.trim())return'idle';return resultCount>0?'results':'no-results'}
