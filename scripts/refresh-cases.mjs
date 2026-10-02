// Refresh the public backup catalog. Uses no CommerceML credentials.
import {writeFile} from 'node:fs/promises';
const products=[],seen=new Set();
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value||[];}catch{return [];}};
const plain=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim();
for(let slice=1;slice<=100;slice++){
 const url=new URL('https://store.tildaapi.com/api/getproductslist/');
 url.search=new URLSearchParams({storepartuid:'676741207832',recid:'815255442',size:'100',slice:String(slice),sort:'sort-created-desc',flag_root:'withroot'});
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Referer:'https://speedwash.ru/cases',Origin:'https://speedwash.ru'}});
 if(!response.ok)throw Error('Catalog HTTP '+response.status);
 const data=await response.json();if(!Array.isArray(data.products))throw Error('Unknown catalog format');
 const fresh=data.products.filter(p=>!seen.has(String(p.uid)));fresh.forEach(p=>seen.add(String(p.uid)));products.push(...fresh);
 if(products.length>=Number(data.total||Infinity)||!data.products.length)break;
 if(!fresh.length||slice===100)throw Error('Catalog pagination failed');
}
if(!products.length)throw Error('Refusing to replace the backup with an empty catalog');
const cases=products.map(p=>{
 const opts=Object.fromEntries(parse(p.json_options).map(o=>[o.title,o.values?.[0]||'']));
 const edition=parse(p.editions)[0]||{};
 const chars=Object.fromEntries(parse(p.characteristics).map(c=>[c.title||c.name,c.value]));
 return {id:String(p.uid),city:plain(opts['Город']||edition['Город']),country:plain(opts['Страна']||edition['Страна']),model:plain(opts['Модель робот-мойки']||edition['Модель робот-мойки']),region:plain(opts['Регион']||edition['Регион']||chars['Регион']),title:plain(p.title),address:plain(p.descr),url:new URL(p.buttonlink||p.url,'https://speedwash.ru').href,image:parse(p.gallery)[0]?.img||''};
});
await writeFile(new URL('../assets/cases.json',import.meta.url),JSON.stringify({updated:new Date().toISOString().slice(0,10),cases},null,2)+'\n');
console.log('Saved '+cases.length+' public cases');
