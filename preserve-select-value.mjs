// Preserve stored delivery assignments while a dealership's validated roster is incomplete.
// Adds no employee, account, department or privilege. Never inserts HTML.
export function preserveSelectValue(select,value){
 if(!select||select.tagName!=='SELECT')return;
 const stored=typeof value==='string'?value:'';
 for(const option of [...select.options])if(option.dataset.preservedAssignment==='true')option.remove();
 if(stored&&![...select.options].some(option=>option.value===stored)){
  const option=select.ownerDocument.createElement('option');option.value=stored;option.textContent=stored;option.dataset.preservedAssignment='true';select.append(option);
 }
}
export function enableManualDeliveryAssignments(form){
 for(const [name,label] of [['finance','Nom du responsable financier'],['driver','Nom du responsable de la livraison']]){
  const field=form.elements[name];if(!field||field.tagName!=='SELECT')continue;
  const input=form.ownerDocument.createElement('input');input.type='text';input.name=name;input.required=field.required;input.value=field.value;input.maxLength=160;input.placeholder=label;input.autocomplete='off';
  field.replaceWith(input);
  const help=form.ownerDocument.createElement('small');help.textContent='Affectation saisie manuellement. Aucun compte ni droit d’accès n’est créé.';input.after(help);
 }
}
export function mountDepartmentDirectory(root,groups){
 const d=root.ownerDocument,el=(tag,text)=>{const e=d.createElement(tag);e.textContent=text;return e;};root.replaceChildren(el('h2','Équipe par département'),el('p','Liste issue de l’annuaire. Ce n’est pas un organigramme : les liens hiérarchiques restent à valider.'));
 for(const group of groups){root.append(el('h3',group.label));const list=el('ul','');for(const person of group.rows)list.append(el('li',(person.name||'Nom à préciser')+' · '+(person.poste||'Poste à préciser')));root.append(list);}
 if(!groups.some(g=>g.rows.length))root.append(el('p','Aucun employé renseigné pour cette concession.'));
}
