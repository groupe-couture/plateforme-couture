// Consultation documentaire uniquement : aucune projection vers les résultats.
import {readableSourceValue,sourceValue,sourceFormat} from './history-source-ui.mjs?v=1.21.13';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=new Set(['vente:VN','vente:VO','service:all','piece:all']);
export function documentaryRecords(result,{monthlyImportId,group=false,dealershipId,allowedSections=[]}={}){
 const batch=result?.batch;
 if(!monthlyImportId||!batch?.id||batch.status!=='completed'||batch.monthly_import_id!==monthlyImportId)return [];
 return (Array.isArray(result.records)?result.records:[]).filter(r=>r.import_id===batch.id&&(group||r.visibility==='concession'&&r.source_kind==='dashboard_aad'&&!!dealershipId&&r.dealership_id===dealershipId&&sections.has(r.section)&&allowedSections.includes(r.section)));
}
export function documentaryDate(value){
 if(!value)return 'non renseignée';
 const raw=String(value);
 if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw))return 'Date source non reconnue : '+raw;
 const date=new Date(raw);if(!Number.isFinite(date.getTime()))return 'Date source non reconnue : '+raw;
 return new Intl.DateTimeFormat('fr-CA',{dateStyle:'long',...(raw.includes('T')?{timeStyle:'short'}:{}),timeZone:'UTC'}).format(date)+(raw.includes('T')?' (UTC)':'');
}
function recordHtml(r){
 return '<article><h4>'+esc(r.data?.label||'Ligne source')+'</h4><p>Ligne '+esc(r.source_row)+' · section '+esc(r.section)+'</p>'+((r.data?.fields||[]).length?'<div class="ls-table-wrap" style="overflow-x:auto"><table class="ls-report"><thead><tr><th>Cellule / libellé source</th><th>Valeur source</th><th>État</th></tr></thead><tbody>'+r.data.fields.map(f=>{
 const format=typeof f.format==='object'?f.format?.type:f.format;
 const classification=f.classification==='error'?'Erreur dans la source':f.classification==='blank'?'Vide · non renseigné':f.formula||f.classification==='formula'?'Formule source · non validée':f.classification==='literal'?'Saisie dans la source':'État non renseigné';
 return '<tr><td>'+esc(f.cell)+' · '+esc(f.label)+(f.periodLabel?'<br>Période source : '+esc(f.periodLabel):'')+'</td><td>'+esc(readableSourceValue({...f,format}))+'<br>Format : '+esc(sourceFormat(format))+(typeof f.value==='number'?'<details><summary>Valeur brute exacte</summary>'+esc(sourceValue(f))+'</details>':'')+'</td><td>'+esc(classification)+(f.semanticStatus==='ambiguous'?'<br>Interprétation ambiguë · à confirmer':'')+(f.warning?'<br>'+esc(f.warning):'')+(f.formula?'<details><summary>Formule source</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(f.formula)+'</pre></details>':'')+'</td></tr>';

 }).join('')+'</tbody></table></div>':'<p>Aucun champ documentaire représenté pour cette ligne.</p>')+'</article>';
}
export function documentaryHtml(result,context){
 if(result?.unavailable)return '<p>Sources et objectifs indisponibles pour le moment. L’historique reste disponible.</p>';
 const records=documentaryRecords(result,context),batch=result?.batch;
 if(!batch||batch.status!=='completed'||batch.monthly_import_id!==context.monthlyImportId)return '<p>Aucun lot documentaire publié pour cet import mensuel.</p>';
 const groups=new Map();
 for(const record of records){const key=JSON.stringify([record.source_kind,record.source_sheet_id]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
 const grouped=[...groups.values()].sort((a,b)=>Number(a[0].source_kind==='template')-Number(b[0].source_kind==='template'));
 return '<p class="notice">Consultation documentaire en lecture seule. Les objectifs et modèles ne sont pas des réalisations et ne sont jamais ajoutés aux indicateurs, rapports ou PDF. Les formules ne sont pas exécutées ni validées.</p><p>Source : Téléprésence · documents sources et objectifs<br>Dernière modification du fichier source : '+esc(documentaryDate(batch.source_modified_at))+'<br>Import terminé : '+esc(documentaryDate(batch.completed_at))+'</p>'+(batch.source_file_id?'<details><summary>Identifiant technique du fichier source</summary>'+esc(batch.source_file_id)+'</details>':'')+(!records.length?'<p>Aucune cellule documentaire autorisée dans cette sélection.</p>':grouped.map(group=>{
 const first=group[0],template=first.source_kind==='template',nature=template?'Modèle · réservé au Groupe':first.source_kind==='dashboard_aad'?'Dashboard AAD · documentaire':'Nature source : '+first.source_kind;
 // Le titre exact fourni par le parseur reste du texte, jamais déduit de l’identifiant.
 return '<details data-documentary-sheet'+(template?'':' open')+'><summary>'+esc(nature)+' · '+esc(first.data?.sheetTitle||'Libellé d’onglet non fourni')+' · '+group.length+' ligne(s)</summary>'+(template?'<p class="notice">Valeurs de modèle, non retenues comme données actuelles.</p>':'<p>Documents de référence et objectifs, sans validation comme résultats actuels.</p>')+'<details><summary>Identifiant technique de l’onglet</summary>'+esc(first.source_sheet_id)+'</details>'+group.map(recordHtml).join('')+'</details>';
 }).join(''));
}
// Le propriétaire fournit une garde couvrant identité, section, import et fermeture.
export async function loadDocumentary(target,read,context,isCurrent){
 target.textContent='Chargement des sources et objectifs…';
 try{const result=await read();if(isCurrent()&&target.isConnected)target.innerHTML=documentaryHtml(result,context);}
 catch{if(isCurrent()&&target.isConnected)target.textContent='Sources et objectifs indisponibles pour le moment. L’historique reste disponible.';}
}
