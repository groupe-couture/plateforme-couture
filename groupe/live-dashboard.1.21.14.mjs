import {passwordReturnTarget} from '../password-flow.mjs?v=1.21.14';
import {supabaseConfig} from '../supabase-config.js?v=1.21.14';
import {readAccessContext} from '../access-context.mjs?v=1.21.14';
import {createCentralReporting} from './reporting.mjs?v=1.21.14';
import {createManagementApi} from '../management-api.mjs?v=1.21.14';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const knownReportSections=new Set(['vente:VN','vente:VO','service:all','piece:all','esthetique:all']);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sectionList=value=>Array.isArray(value)&&value.every(s=>knownReportSections.has(s))?[...new Set(value)]:null;
function officialProgress(period,submissions){
 // Pick the newest exact period/concession BEFORE validating its payload. Never
 // borrow another period or silently reuse an older snapshot if newest is invalid.
 const candidates=submissions.filter(s=>s?.period_id===period.id&&s.dealership_id===period.dealership_id&&Number.isInteger(s.sequence)&&s.sequence>0).sort((a,b)=>b.sequence-a.sequence);
 const selected=candidates[0],snapshot=selected?.snapshot;
 if(!record(snapshot)||snapshot.schemaVersion!==1||!record(snapshot.sections))return null;
 if(snapshot.dealershipId!==undefined&&snapshot.dealershipId!==period.dealership_id)return null;
 if(snapshot.sequence!==undefined&&snapshot.sequence!==selected.sequence)return null;
 if(period.kind&&snapshot.kind!==period.kind)return null;
 if(snapshot.kind==='monthly_final'&&snapshot.balanceWithStatement!==true)return null;
 if(period.end_date&&snapshot.endDate!==period.end_date)return null;
 if(period.start_date&&snapshot.startDate!==undefined&&snapshot.startDate!==period.start_date)return null;
 if(candidates.some(s=>s.sequence===selected.sequence&&JSON.stringify(s.snapshot)!==JSON.stringify(snapshot)))return null;
 const required=sectionList(snapshot.requiredSections===undefined?period.required_sections:snapshot.requiredSections);
 if(required===null)return null;
 const completed=required.filter(section=>Object.hasOwn(snapshot.sections,section)&&record(snapshot.sections[section])&&record(snapshot.sections[section].data)&&record(snapshot.sections[section].data.values)).length;
 return {total:required.length,completed};
}
export function normalizeReportPeriods(periods,progress,submissions,{memberships}={}){
 return periods.map(p=>{
  const submitted=p.status==='submitted',official=submitted?officialProgress(p,submissions):null;
  const ownProgress=Array.isArray(memberships)?memberships.some(m=>m.dealership_id===p.dealership_id&&['admin','dg','director'].includes(m.role)&&m.reporting_enabled===true):progress.some(r=>r.period_id===p.id);
  return {...p,endDate:p.end_date,total:official?.total??sectionList(p.required_sections)?.length??0,
   completed:submitted?(official?.completed??0):(ownProgress?progress.filter(r=>r.period_id===p.id&&r.ready).length:0),
   completionSource:submitted?(official?'official-snapshot':'official-unavailable'):(ownProgress?'authorized-progress':'progress-unavailable'),
   progressUnavailable:!submitted&&!ownProgress,
   ...(submitted?{officialProgressAvailable:official!==null}:{}),
   balanceWithStatement:p.balance_with_statement===true,
   correcting:p.status!=='submitted'&&submissions.some(s=>s.period_id===p.id)};
 });
}
export async function connectLiveDashboard({onData,onClear,onReload=async()=>false}){
 const passwordTarget=passwordReturnTarget(location.href);if(passwordTarget){location.replace(passwordTarget);return;}
 const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
 const client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}),api=createCentralReporting(client);
 let generation=0,pending=false,authenticated=false,sessionUserId='',historyCache=null,scopeKey='';
 async function refresh({clear=false}={}){
  if(pending&&!clear)return;const token=++generation;pending=true;if(clear){onClear();$('#groupShell').hidden=true;}$('#groupError').textContent='';
  try{
   const scope=await readAccessContext(client);if(token!==generation)return;
   $('#ownConcessions').innerHTML=scope.memberships.map(m=>'<a href="../?concession='+encodeURIComponent(m.dealership_id)+'">'+esc(m.name)+'</a>').join('');
   const operational=scope.memberships.filter(m=>['admin','dg','director'].includes(m.role)&&m.reporting_enabled);
   if(!scope.canReadGroup&&!operational.length){historyCache=null;onClear();$('#groupShell').hidden=true;$('#groupLogin').hidden=false;$('#groupError').textContent='Ce compte n’a pas accès aux indicateurs. Ouvrez votre concession pour consulter les écrans permis.';return;}
   const nextScope=JSON.stringify(scope);if(scopeKey!==nextScope){historyCache=null;onClear();scopeKey=nextScope;}
   const ownView=!scope.canReadGroup;
   const [dealerships,periods,submissions,progress,history]=await Promise.all([api.dealerships(),ownView?[]:api.periods(),ownView?[]:api.submissions(),ownView?[]:api.progress(),api.history(undefined,{cached:historyCache})]);
   if(token!==generation)return;
   history.readFields=source=>api.historyFields(history.batch.id,source.sheetId,source.row);historyCache=history;
   onData({dealerships,periods:normalizeReportPeriods(periods,progress,submissions,{memberships:scope.memberships}),submissions,history,ownView,access:scope,management:createManagementApi(client),documentary:(monthlyImportId,dealershipId)=>api.documentary(monthlyImportId,dealershipId)});
   $('#groupLogin').hidden=true;$('#groupShell').hidden=false;
   $('#liveStatus').textContent='Données du serveur · '+(history.batch?'historique Google Sheets disponible · ':'')+'actualisé à '+new Date().toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'});
  }catch(e){if(token!==generation)return;onClear();$('#groupShell').hidden=true;$('#groupLogin').hidden=false;$('#groupError').textContent=e.message||'Chargement impossible.';}
  finally{if(token===generation)pending=false;}
 }
 $('#groupLoginForm').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{const {error}=await client.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)throw error;f.elements.password.value='';}catch(err){$('#groupError').textContent=err.message;}finally{b.disabled=false;}};
 $('#groupLoginForm button[type=submit]').disabled=false;
 $('#groupLogout').onclick=()=>client.auth.signOut();$('#groupReload').onclick=async()=>{
  const button=$('#groupReload');button.disabled=true;
  try{if(await onReload())return;}
  catch{/* Une erreur de vérification ne bloque pas l’actualisation des données. */}
  finally{button.disabled=false;}
  historyCache=null;await refresh();
 };
 client.auth.onAuthStateChange((event,session)=>{
  if(!['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event))return;
  const nextUserId=session?.user?.id||'';
  if(nextUserId&&authenticated&&nextUserId===sessionUserId&&!$('#groupShell').hidden)return;
  sessionUserId=nextUserId;authenticated=!!session?.user;generation++;historyCache=null;scopeKey='';onClear();$('#groupShell').hidden=true;$('#groupLogin').hidden=false;$('#ownConcessions').innerHTML='';
  if(authenticated)queueMicrotask(()=>refresh({clear:true}));
 });
 const timer=setInterval(async()=>{if(authenticated&&!document.hidden&&!await onReload())refresh();},30000);
 document.addEventListener('visibilitychange',async()=>{if(authenticated&&!document.hidden&&!await onReload())refresh();});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
