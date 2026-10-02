// Build the local vector map. No map SDK or API key is required in the browser.
import {geoConicEqualArea, geoPath} from 'd3-geo';
import {writeFile} from 'node:fs/promises';
const base='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const [countries, regions]=await Promise.all(['ne_50m_admin_0_countries.geojson','ne_50m_admin_1_states_provinces.geojson'].map(async file=>{
 const response=await fetch(base+file);if(!response.ok)throw Error(response.status);return response.json();
}));
const selected=countries.features.filter(f=>['Russia','Belarus','Kazakhstan'].includes(f.properties.ADMIN));
const projection=geoConicEqualArea().parallels([50,70]).rotate([-100,0]).center([0,60]).fitExtent([[45,65],[955,510]],{type:'FeatureCollection',features:selected});
const path=geoPath(projection).digits(1);
const names={
 'RU-ARK':'Архангельская область','RU-SAK':'Сахалинская область','RU-NVS':'Новосибирская область','RU-YAR':'Ярославская область',
 'RU-MOS':'Москва','RU-MOW':'Московская область','RU-BA':'Башкортостан','RU-KIR':'Кировская область','RU-SVE':'Свердловская область',
 'RU-VGG':'Волгоградская область','RU-KDA':'Краснодарский край','RU-KHM':'ХМАО — Югра','RU-LIP':'Липецкая область',
 'RU-UD':'Удмуртия','RU-IRK':'Иркутская область','RU-TOM':'Томская область','RU-ORE':'Оренбургская область',
 'RU-TYU':'Тюменская область','RU-KK':'Хакасия','RU-CHE':'Челябинская область','RU-KEM':'Кемеровская область',
 'RU-VLA':'Владимирская область','RU-KOS':'Костромская область'
};
const cityRegions={
 'Архангельск':'RU-ARK','Верхнеяркеево':'RU-BA','Южно-Сахалинск':'RU-SAK','Новосибирск':'RU-NVS',
 'Ярославль':'RU-YAR','Москва':'RU-MOS','Стерлитамак':'RU-BA','Киров':'RU-KIR','Ревда':'RU-SVE',
 'Пушкино':'RU-MOW','Волгоград':'RU-VGG','Краснодар':'RU-KDA','Сургут':'RU-KHM','Липецк':'RU-LIP',
 'Октябрьский':'RU-BA','Ижевск':'RU-UD','Нижневартовск':'RU-KHM','Красногорск':'RU-MOW','Иркутск':'RU-IRK',
 'Томск':'RU-TOM','Полевской':'RU-SVE','Орск':'RU-ORE','Тюмень':'RU-TYU','Абакан':'RU-KK',
 'Магнитогорск':'RU-CHE','Донецк':'DONETSK','Сатка':'RU-CHE','Нефтекамск':'RU-BA','Уфа':'RU-BA',
 'Усть-Илимск':'RU-IRK','Дедовск':'RU-MOW','Прокопьевск':'RU-KEM','Таштагол':'RU-KEM',
 'Покров':'RU-VLA','Красном-на-Волге':'RU-KOS','Красное-на-Волге':'RU-KOS',
 'Рудный':'KZ-KUS','Костанай':'KZ-KUS','Петропавловск':'KZ-SEV','Витебск':'BY-VIT','Минск':'BY-MIN'
};
const features=regions.features.filter(f=>f.properties.admin==='Russia');
const geometry=features.map(f=>({id:f.properties.iso_3166_2,name:names[f.properties.iso_3166_2]||f.properties.name_ru||f.properties.name,country:'Россия',path:path(f),bounds:path.bounds(f)}));
for(const f of selected.filter(f=>f.properties.ADMIN!=='Russia'))geometry.push({id:f.properties.ADM0_A3,name:f.properties.ADMIN==='Belarus'?'Беларусь':'Казахстан',country:f.properties.ADMIN==='Belarus'?'Беларусь':'Казахстан',path:path(f),bounds:path.bounds(f)});
// Region markers are representative points; they do not claim exact street coordinates.
const representatives={
 'RU-ARK':[40.54,64.54],'RU-SAK':[142.74,46.96],'RU-NVS':[82.92,55.03],'RU-YAR':[39.89,57.63],
 'RU-MOS':[37.62,55.75],'RU-MOW':[36.65,56.5],'RU-BA':[55.96,54.74],'RU-KIR':[49.66,58.6],
 'RU-SVE':[60.61,56.84],'RU-VGG':[44.52,48.71],'RU-KDA':[38.98,45.04],'RU-KHM':[73.39,61.1],
 'RU-LIP':[39.6,52.61],'RU-UD':[53.21,56.85],'RU-IRK':[104.28,52.29],'RU-TOM':[84.97,56.5],
 'RU-ORE':[55.1,51.77],'RU-TYU':[65.53,57.15],'RU-KK':[91.44,53.72],'RU-CHE':[61.4,55.16],
 'RU-KEM':[86.09,54.5],'RU-VLA':[40.4,55.95],'RU-KOS':[40.92,57.51],
 'KZ-KUS':[63.62,53.21],'KZ-SEV':[69.15,54.86],'BY-VIT':[30.2,55.19],'BY-MIN':[27.56,53.9], 'DONETSK':[37.8,48.0]
};
const extraNames={'KZ-KUS':'Костанайская область','KZ-SEV':'Северо-Казахстанская область','BY-VIT':'Витебская область','BY-MIN':'Минск','DONETSK':'Донецк'};
const groups=Object.entries(representatives).map(([id,coord])=>({id,name:names[id]||extraNames[id],country:id.startsWith('KZ')?'Казахстан':id.startsWith('BY')?'Беларусь':'Россия',point:projection(coord).map(x=>+x.toFixed(1))}));
// Any Russian region can be specified explicitly in the catalog, even before its first case.
for(const feature of features){
 const id=feature.properties.iso_3166_2;
 if(!groups.some(group=>group.id===id))groups.push({id,name:feature.properties.name_ru||feature.properties.name,country:'Россия',point:path.centroid(feature).map(x=>+x.toFixed(1))});
}
const outlines=selected.map(f=>({country:f.properties.ADMIN==='Russia'?'Россия':f.properties.ADMIN==='Belarus'?'Беларусь':'Казахстан',path:path(f),bounds:path.bounds(f)}));
await writeFile(new URL('../assets/map.json',import.meta.url),JSON.stringify({width:1000,height:560,geometry,outlines,groups,cityRegions,overrides:{'185620466012':'RU-MOW'}}));
console.log('Built vector map:',geometry.length,'regions,',groups.length,'project groups');
