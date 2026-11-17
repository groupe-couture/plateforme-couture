import {complete} from './domain.mjs?v=1.21.14';
export function preparationArchiveError(v){
 if(!v||v.type!=='VO')return 'Sélectionnez un véhicule d’occasion.';
 if(v.archived)return 'Ce dossier est déjà archivé.';
 if(v.preparationArchivedAt)return 'Cette préparation est déjà archivée.';
 if(v.blocker?.trim())return 'Résolvez le blocage avant de confirmer le véhicule prêt.';
 if(!complete(v))return 'Complétez les étapes et les travaux avant de confirmer le véhicule prêt.';
 return '';
}
export function archivePreparation(v,by,at=new Date().toISOString()){
 const error=preparationArchiveError(v);if(error)throw Error(error);
 return {...structuredClone(v),preparationArchivedAt:at,preparationArchivedBy:by};
}
export function restorePreparation(v){if(v.delivery?.status==='Livré')throw Error('Ce véhicule est déjà livré; sa préparation reste dans les archives.');return {...structuredClone(v),preparationArchivedAt:null,preparationArchivedBy:null};}
export function archivedPreparations(records){return records.filter(v=>v.type==='VO'&&(v.preparationArchivedAt||v.archived)).sort((a,b)=>String(b.preparationArchivedAt||b.updatedAt||'').localeCompare(String(a.preparationArchivedAt||a.updatedAt||'')));}

export function reconcilePreparationArchive(v){if(v.preparationArchivedAt&&(!complete(v)||v.blocker?.trim()))return {...v,preparationArchivedAt:null,preparationArchivedBy:null};return v;}
