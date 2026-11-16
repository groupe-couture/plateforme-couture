const RATIO_FIELDS={margin:['profit','revenue',100],rate:['revenue','hours',1],productivity:['clocked','presence',100],efficiency:['hours','clocked',100],utilization:['hours','presence',100]};
const numeric=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
// Preserve matched-period bases while aggregating. Raw business totals remain untouched.
export function pairedRatios(rows,{aggregated=false}={}){
 const values={ratioBasis:{}};
 for(const [key,[a,b,factor]]of Object.entries(RATIO_FIELDS)){
  const basis={numerator:0,denominator:0,known:0,total:0};
  for(const row of rows){
   const saved=aggregated?row?.ratioBasis?.[key]:null;
   if(saved){for(const field of ['numerator','denominator','known','total'])basis[field]+=saved[field];continue;}
   basis.total++;const numerator=numeric(row?.[a]),denominator=numeric(row?.[b]);
   if(numerator!==null&&denominator!==null){basis.numerator+=numerator;basis.denominator+=denominator;basis.known++;}
  }
  values.ratioBasis[key]=basis;
  values[key]=basis.known&&basis.denominator>0?basis.numerator/basis.denominator*factor:null;
 }
 return values;
}
export function ratioCoverageText(values,key){
 const b=values?.ratioBasis?.[key];
 return b&&b.total>0?`${b.known} / ${b.total} périodes avec les deux valeurs renseignées`:'';
}
export function ratioCoverageIncomplete(values){return Object.values(values?.ratioBasis||{}).some(b=>b.known<b.total);}
