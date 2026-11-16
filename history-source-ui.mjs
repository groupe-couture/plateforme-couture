// Présentation seule : aucune interprétation métier ni évaluation de formule.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Conserver les détails structurés sans évaluer ni convertir leur contenu.
function sourceObjectText(value){
 if(typeof value!=='object'||value===null)return String(value);
 try{return JSON.stringify(value)??String(value);}catch{return 'Objet source non sérialisable';}
}
export function sourceValue(field){
 const value=field.value;
 if(value===null||value===undefined||value==='')return '— (non renseigné)';
 if(typeof value==='object'){
  const error=value.error??value.errorValue;
  if(error!==undefined&&error!==null)return 'Erreur dans la source : '+sourceObjectText(error);
  return 'Valeur source non reconnue : '+sourceObjectText(value);
 }
 return String(value); // Pas d’arrondi, de conversion de pourcentage ni de devise supposée.
}
// Déplacement décimal textuel depuis la valeur brute : aucun arrondi flottant ajouté.
function frenchNumber(value,shift=0){
 const match=String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
 if(!match)return String(value);
 const [,sign,integer,fraction='',exponent='0']=match,digits=integer+fraction,point=integer.length+Number(exponent)+shift;
 const whole=(point<=0?'0':point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point)).replace(/^0+(?=\d)/,'');
 const decimals=(point<=0?'0'.repeat(-point)+digits:point<digits.length?digits.slice(point):'').replace(/0+$/,'');
 return sign+whole.replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+(decimals?','+decimals:'');
}
export function readableSourceValue(field){
 if(typeof field.value!=='number'||!Number.isFinite(field.value))return sourceValue(field);
 return frenchNumber(field.value,field.format==='PERCENT'?2:0)+(field.format==='PERCENT'?' %':'');
}
export function sourceFormat(format){
 return ({NUMBER:'Nombre',PERCENT:'Pourcentage',CURRENCY:'Monétaire (devise non précisée)',TEXT:'Texte',DATE:'Date',TIME:'Heure',DATE_TIME:'Date et heure',SCIENTIFIC:'Scientifique',ACCOUNTING:'Comptable (devise non précisée)'})[format]||(format?'Format non reconnu : '+format:'Non renseigné');
}
export function sourceFreshness(batch){
 return 'Lot importé · modification du fichier source : '+(batch?.source_modified_at||'non renseignée')+' · date de capture : '+(batch?.summary?.asOf||'non renseignée')+'. Cette information ne garantit pas une synchronisation avec le fichier actuel.';
}
export function sourceFields(fields,{source=null,annual=false}={}){
 const context=source?'<p>Source : '+esc(source.sheetTitle)+' · situation au '+esc(source.asOf)+' · ligne '+esc(source.row)+'</p>':'';
 const note='<p>Cellules renseignées conservées à l’import. Les cellules vides ou sans libellé peuvent être omises : leur absence ne signifie pas zéro. Valeurs importées présentées sans arrondi. Seul un format source Pourcentage explicite est converti en pourcentage ; sinon la valeur reste un nombre. Aucun symbole de devise n’est supposé. La valeur brute exacte est accessible pour chaque nombre. Une formule ne constitue pas une validation.</p>';
 return context+(annual?'<p>En AAD, ces cellules sont celles du dernier mois disponible pour ce département, pas le cumul annuel. La date source ci-dessus fait foi.</p>':'')+note+(!fields.length?'<p>Aucune cellule renseignée disponible pour ce département.</p>':'<div class="ls-table-wrap" style="overflow-x:auto"><table class="ls-report"><thead><tr><th>Cellule</th><th>Indicateur source</th><th>Valeur source</th><th>Format source</th><th>Origine</th></tr></thead><tbody>'+fields.map(f=>'<tr><td>'+esc(f.cell)+'</td><td>'+esc(f.label)+'</td><td>'+esc(readableSourceValue(f))+(typeof f.value==='number'?'<details><summary>Voir la valeur brute exacte</summary><span>'+esc(sourceValue(f))+'</span></details>':'')+'</td><td>'+esc(sourceFormat(f.format))+'</td><td>'+(f.formula?'<span>Calculée dans la source · non validée</span><details><summary>Voir la formule source</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(f.formula)+'</pre></details>':'Saisie dans la source · sans formule')+'</td></tr>').join('')+'</tbody></table></div>');
}
