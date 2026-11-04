// This database stores only authenticated list previews and sort preferences.
// The legacy draft database is intentionally neither opened nor modified.
export class NoteCache {
 constructor(){this.db=null;}
 async tx(mode,fn){
  if(!this.db)this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hunghvt-notes-cache-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('cache',{keyPath:'scope'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  return new Promise((resolve,reject)=>{const t=this.db.transaction('cache',mode),r=fn(t.objectStore('cache'));t.oncomplete=()=>resolve(r.result);t.onerror=t.onabort=()=>reject(t.error);});
 }
 async get(scope){return scope?await this.tx('readonly',s=>s.get(scope)):null;}
 async put(scope,value){if(scope)await this.tx('readwrite',s=>s.put({...value,scope}));}
 async delete(scope){if(scope)await this.tx('readwrite',s=>s.delete(scope));}
 async clearAll(){await this.tx('readwrite',s=>s.clear());}
}
export function reusableNote(note,row){return !!note&&!!row&&note.id===row.id&&note.revision===row.revision;}
export function cachedNoteSize(note){try{return new TextEncoder().encode(JSON.stringify(note)).byteLength;}catch{return Infinity;}}
export function projectCachedNote(note){
 if(!note||typeof note.id!=='string'||typeof note.revision!=='string'||typeof note.title!=='string'||typeof note.text!=='string'||!Array.isArray(note.checklist)||!note.checklist.every(item=>item&&typeof item.id==='string'&&typeof item.text==='string'&&typeof item.checked==='boolean'))return null;
 return {id:note.id,title:note.title,text:note.text,checklist:note.checklist.map(item=>({id:item.id,text:item.text,checked:item.checked})),folder:note.folder??'',pinned:note.pinned===true,updatedAt:note.updatedAt,revision:note.revision,history:[],historyLoaded:false};
}
export function retainContentEntry(content,id,entry,{maxNotes=MAX_CACHED_NOTES,maxBytes=MAX_CACHED_CONTENT_BYTES,maxNoteBytes=MAX_CACHED_NOTE_BYTES}={}){
 const next={...content},evicted=[];
 if(!Number.isFinite(entry?.bytes)||entry.bytes<0||entry.bytes>maxNoteBytes){delete next[id];return {content:next,stored:false,reason:'note_too_large',evicted:[id]};}
 next[id]=entry;
 const size=()=>Object.values(next).reduce((total,item)=>total+(Number.isFinite(item?.bytes)?item.bytes:Infinity),0);
 while(Object.keys(next).length>maxNotes||size()>maxBytes){
  const oldest=Object.entries(next).sort((a,b)=>(a[1]?.usedAt??0)-(b[1]?.usedAt??0))[0];
  if(!oldest)break;
  delete next[oldest[0]];evicted.push(oldest[0]);
 }
 return {content:next,stored:Object.hasOwn(next,id),reason:Object.hasOwn(next,id)?null:'content_budget_eviction',evicted};
}
export const MAX_CACHED_NOTE_BYTES=1024*1024;
export const MAX_CACHED_CONTENT_BYTES=4*1024*1024;
export const MAX_CACHED_NOTES=12;
export const MAX_CACHED_LIST_BYTES=512*1024;
export const MAX_CACHED_LIST_NOTES=1000;
