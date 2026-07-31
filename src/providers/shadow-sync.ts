import crypto from 'crypto';
import { getDB } from '../database.js';
import { isShadowSyncEnabled } from './connection-migration.js';
import { loadDefaultReaders, snapshotReaders, reconcileSnapshots } from './connection-reconciliation.js';

export interface ShadowSyncResult{
 enabled:boolean; runAt:string; recordsCompared:number;
 driftCategories:{category:string;count:number}[];
 diagnostics:{legacyId:string;providerConnectionId:string|null;providerId:string;driftCategory:string}[];
}

export async function runShadowSync(opts:{now?:string}={}):Promise<ShadowSyncResult>{
 const enabled=isShadowSyncEnabled();
 const nowIso=opts.now||new Date().toISOString();
 if(!enabled) return{enabled:false,runAt:nowIso,recordsCompared:0,driftCategories:[],diagnostics:[]};
 const readers=await loadDefaultReaders();
 const snap=snapshotReaders(readers);
 const records=reconcileSnapshots(snap.legacy,snap.providers,nowIso);
 const diagnostics=records.filter(r=>r.matchStatus!=='provider_connection_only').map(r=>({legacyId:r.legacyId||'unknown',providerConnectionId:r.providerConnectionId,providerId:r.providerId,driftCategory:r.matchStatus}));
 const driftMap=new Map<string,number>();
 for(const d of diagnostics) driftMap.set(d.driftCategory,(driftMap.get(d.driftCategory)||0)+1);
 const driftCategories=[...driftMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([category,count])=>({category,count}));
 const db=getDB();
 const now=new Date().toISOString();
 for(const d of diagnostics){
  const id=crypto.createHash('sha256').update([d.legacyId,d.providerConnectionId,d.providerId].join('|')).digest('hex').slice(0,32);
  db.prepare(`INSERT OR REPLACE INTO provider_connection_shadow_diagnostics(id,providerId,legacyId,providerConnectionId,driftCategory,lastComparedAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,COALESCE((SELECT createdAt FROM provider_connection_shadow_diagnostics WHERE id=?),?),?)`).run(id,d.providerId,d.legacyId,d.providerConnectionId||null,d.driftCategory,nowIso,id,now,now);
 }
 return{enabled:true,runAt:nowIso,recordsCompared:records.length,driftCategories,diagnostics};
}
