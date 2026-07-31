import { getDB } from '../database.js';
import { isProviderConnectionRuntimeEnabled, type ProviderConnectionMetadata } from './connections.js';

export type MatchStatus = 'exact_match'|'legacy_only'|'provider_connection_only'|'ambiguous'|'unmappable'|'metadata_drift';
export type MigrationEligibility = 'eligible'|'requires_review'|'blocked';
export interface LegacySafeConnection { id:string; providerId:string; label:string; authType:string; isActive:boolean; testStatus:string|null; baseUrl:string|null; proxyUrl:string|null; region:string|null; credentialPresent:boolean; }
export interface ReconciliationRecord { legacyId:string|null; providerId:string; label:string; legacyAuthType:string|null; mappedAuthType:string|null; legacyActive:boolean|null; providerConnectionId:string|null; connectionStatus:string|null; matchStatus:MatchStatus; migrationEligibility:MigrationEligibility; reasons:string[]; unmappableFields:string[]; metadataDrift:string[]; credentialPresent:boolean; accountRef:string|null; priority:number|null; weight:number|null; expiryState:string; cooldownState:string; quotaState:string; discoveredModelCount:number; }
export interface PreviewReport { schemaVersion:'phase4b2-preview-v1'; generatedAt:string; summary:Record<string,number>; providers:{providerId:string; total:number; legacyOnly:number; providerConnectionOnly:number; exactMatches:number; ambiguous:number; blocked:number}[]; authTypes:{authType:string; total:number}[]; statuses:{status:string; total:number}[]; sourceSchemaVersions:{legacy:string; providerConnections:string}; featureFlagEnabled:boolean; records:ReconciliationRecord[]; }
export interface ReconciliationReaders { readLegacy():LegacySafeConnection[]; readProviderConnections():ProviderConnectionMetadata[]; now?():string; }

const norm=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const mapAuth=(a:string):string=>a==='apikey'?'api_key':(a||'custom');
const validIso=(s:string|null)=>!s||Number.isFinite(Date.parse(s));
const expState=(s:string|null)=>!s?'none':validIso(s)?(Date.parse(s)<=Date.now()?'expired':'valid'):'invalid';
const coolState=(s:string|null)=>!s?'none':validIso(s)?(Date.parse(s)>Date.now()?'cooldown':'clear'):'invalid';
const quota=(c:ProviderConnectionMetadata)=>c.quotaLimit==null&&c.quotaRemaining==null?'absent':'present';

export function readLegacySafeConnections(): LegacySafeConnection[] {
  const rows=getDB().prepare(`SELECT id, provider, name, authType, isActive, testStatus, baseUrl, proxyUrl, region, CASE WHEN encryptedCredential IS NOT NULL OR apiKey IS NOT NULL OR accessToken IS NOT NULL OR refreshToken IS NOT NULL THEN 1 ELSE 0 END AS credentialPresent FROM connections ORDER BY provider, name, id`).all() as any[];
  return rows.map(r=>({id:r.id,providerId:r.provider,label:r.name||r.provider,authType:r.authType||'apikey',isActive:r.isActive===1,testStatus:r.testStatus||null,baseUrl:r.baseUrl||null,proxyUrl:r.proxyUrl||null,region:r.region||null,credentialPresent:r.credentialPresent===1}));
}

export function defaultReconciliationReaders(): ReconciliationReaders {
  return { readLegacy: readLegacySafeConnections, readProviderConnections: asyncFreeListConnections, now:()=>new Date().toISOString() };
}
function asyncFreeListConnections():ProviderConnectionMetadata[]{ throw new Error('reader not initialized'); }

export async function loadDefaultReaders(): Promise<ReconciliationReaders> {
  const mod = await import('./connections.js');
  return { readLegacy: readLegacySafeConnections, readProviderConnections: mod.listConnections, now:()=>new Date().toISOString() };
}

export function reconcileConnections(readers: ReconciliationReaders): ReconciliationRecord[] {
  const legacy=readers.readLegacy().sort((a,b)=>(a.providerId+a.label+a.id).localeCompare(b.providerId+b.label+b.id));
  const pcs=readers.readProviderConnections().sort((a,b)=>(a.providerId+a.label+a.id).localeCompare(b.providerId+b.label+b.id));
  const used=new Set<string>(); const out:ReconciliationRecord[]=[];
  for(const l of legacy){ const unm=['baseUrl','proxyUrl','region','testStatus'].filter(k=>(l as any)[k]); const candidates=pcs.filter(p=>p.providerId===l.providerId); let chosen:ProviderConnectionMetadata|null=null; let status:MatchStatus='legacy_only'; let elig:MigrationEligibility='requires_review'; const reasons:string[]=[]; const drift:string[]=[];
    const explicit=candidates.filter(p=>p.metadata?.legacyCredentialId===l.id); if(explicit.length===1){chosen=explicit[0];status='exact_match';elig='eligible';reasons.push('explicit legacyCredentialId match')} else if(explicit.length>1){status='ambiguous';elig='blocked';reasons.push('conflicting explicit reference')}
    if(!chosen&&status!=='ambiguous'){ const label=candidates.filter(p=>norm(p.label)===norm(l.label)); if(label.length===1){chosen=label[0]; status='exact_match'; elig='eligible'; reasons.push('unique normalized label match'); if(chosen.authType!==mapAuth(l.authType)){status='metadata_drift';elig='blocked';drift.push('authType')} if((chosen.status!=='disabled')!==l.isActive){status='metadata_drift';elig='requires_review';drift.push('activeStatus')} } else if(label.length>1){status='ambiguous';elig='blocked';reasons.push('duplicate normalized label candidates')} }
    if(!chosen&&status!=='ambiguous'&&candidates.length===1){chosen=candidates[0];status='metadata_drift';elig='requires_review';reasons.push('providerId-only candidate requires review')}
    else if(!chosen&&status!=='ambiguous'&&candidates.length>1){status='ambiguous';elig='blocked';reasons.push('multiple providerId candidates')}
    if(chosen){used.add(chosen.id); if(!validIso(chosen.expiresAt)||!validIso(chosen.cooldownUntil)||!validIso(chosen.quotaResetAt)){elig='blocked';reasons.push('invalid lifecycle timestamp')} if(unm.includes('baseUrl')||unm.includes('proxyUrl')){ if(elig==='eligible') elig='requires_review'; reasons.push('unsupported legacy routing identity field') } }
    out.push(makeRecord(l,chosen,status,elig,reasons,unm,drift)); }
  for(const p of pcs.filter(p=>!used.has(p.id))){out.push(makeRecord(null,p,'provider_connection_only','requires_review',['no legacy match'],[],[]));}
  return out.sort((a,b)=>(a.providerId+(a.legacyId||'')+(a.providerConnectionId||'')).localeCompare(b.providerId+(b.legacyId||'')+(b.providerConnectionId||'')));
}
function makeRecord(l:LegacySafeConnection|null,p:ProviderConnectionMetadata|null,matchStatus:MatchStatus,migrationEligibility:MigrationEligibility,reasons:string[],unmappableFields:string[],metadataDrift:string[]):ReconciliationRecord{ return { legacyId:l?.id??null, providerId:l?.providerId??p!.providerId, label:l?.label??p!.label, legacyAuthType:l?.authType??null, mappedAuthType:l?mapAuth(l.authType):p!.authType, legacyActive:l?.isActive??null, providerConnectionId:p?.id??null, connectionStatus:p?.status??null, matchStatus, migrationEligibility, reasons, unmappableFields, metadataDrift, credentialPresent:!!l?.credentialPresent, accountRef:p?.accountRef??null, priority:p?.priority??null, weight:p?.weight??null, expiryState:p?expState(p.expiresAt):'none', cooldownState:p?coolState(p.cooldownUntil):'none', quotaState:p?quota(p):'absent', discoveredModelCount:p?.discoveredModels.length??0 }; }
export function buildPreviewReport(readers:ReconciliationReaders, includeRecords=true):PreviewReport{ const records=reconcileConnections(readers); const count=(f:(r:ReconciliationRecord)=>boolean)=>records.filter(f).length; const providers=[...new Set(records.map(r=>r.providerId))].sort().map(providerId=>({providerId,total:count(r=>r.providerId===providerId),legacyOnly:count(r=>r.providerId===providerId&&r.matchStatus==='legacy_only'),providerConnectionOnly:count(r=>r.providerId===providerId&&r.matchStatus==='provider_connection_only'),exactMatches:count(r=>r.providerId===providerId&&r.matchStatus==='exact_match'),ambiguous:count(r=>r.providerId===providerId&&r.matchStatus==='ambiguous'),blocked:count(r=>r.providerId===providerId&&r.migrationEligibility==='blocked')})); const authTypes=[...new Set(records.map(r=>r.mappedAuthType||'unknown'))].sort().map(authType=>({authType,total:count(r=>(r.mappedAuthType||'unknown')===authType)})); const statuses=[...new Set(records.map(r=>r.connectionStatus||'none'))].sort().map(status=>({status,total:count(r=>(r.connectionStatus||'none')===status)})); return {schemaVersion:'phase4b2-preview-v1',generatedAt:readers.now?.()||new Date().toISOString(),summary:{totalLegacy:readers.readLegacy().length,totalProviderConnections:readers.readProviderConnections().length,exactMatches:count(r=>r.matchStatus==='exact_match'),legacyOnly:count(r=>r.matchStatus==='legacy_only'),providerConnectionOnly:count(r=>r.matchStatus==='provider_connection_only'),ambiguous:count(r=>r.matchStatus==='ambiguous'),unmappable:count(r=>r.matchStatus==='unmappable'),metadataDrift:count(r=>r.matchStatus==='metadata_drift'),migrationEligible:count(r=>r.migrationEligibility==='eligible'),requiresReview:count(r=>r.migrationEligibility==='requires_review'),blocked:count(r=>r.migrationEligibility==='blocked')},providers,authTypes,statuses,sourceSchemaVersions:{legacy:'connections-v1',providerConnections:'provider_connections-v1'},featureFlagEnabled:isProviderConnectionRuntimeEnabled(),records:includeRecords?records:[]}; }
export async function buildDefaultPreviewReport(includeRecords=true):Promise<PreviewReport>{return buildPreviewReport(await loadDefaultReaders(),includeRecords)}
