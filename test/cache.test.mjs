import test from 'node:test';
import assert from 'node:assert/strict';
import {reusableNote,cachedNoteSize,projectCachedNote,retainContentEntry,NoteCache,MAX_CACHED_NOTE_BYTES,MAX_CACHED_CONTENT_BYTES,MAX_CACHED_NOTES,MAX_CACHED_LIST_BYTES,MAX_CACHED_LIST_NOTES} from '../public/cache.js';
test('cached content must match both ID and revision; absent, moved or newer rows invalidate it',()=>{
 const note={id:'one',revision:'r1',text:'private'};
 assert.equal(reusableNote(note,{id:'one',revision:'r1'}),true);
 for(const row of [undefined,{id:'two',revision:'r1'},{id:'one',revision:'r2'}])assert.equal(reusableNote(note,row),false);
});
test('unauthenticated cache access does not open IndexedDB',async()=>{
 const cache=new NoteCache();cache.tx=()=>{throw Error('must not open storage');};
 assert.equal(await cache.get(null),null);await cache.put(null,{text:'never written'});await cache.delete(null);
});
test('private acknowledged cache has explicit storage bounds',()=>{
 assert.equal(MAX_CACHED_NOTE_BYTES,1024*1024);assert.equal(MAX_CACHED_CONTENT_BYTES,4*1024*1024);assert.equal(MAX_CACHED_NOTES,12);assert.equal(MAX_CACHED_LIST_BYTES,512*1024);assert.equal(MAX_CACHED_LIST_NOTES,1000);
});
test('content cache stores current fields only and leaves history explicitly unloaded',()=>{
 const base={id:'synthetic',revision:'r1',title:'small',text:'x',checklist:[{id:'c1',text:'y'.repeat(5000),checked:true}],history:[{title:'old',text:'h'.repeat(2_000_000),checklist:[],updatedAt:'then'}]};
 const cached=projectCachedNote(base);assert.equal(cached.history.length,0);assert.equal(cached.historyLoaded,false);assert.equal(cached.text,base.text);assert.deepEqual(cached.checklist,base.checklist);assert.ok(cachedNoteSize(cached)<MAX_CACHED_NOTE_BYTES);
 const nearPreviousLimit=projectCachedNote({...base,text:'😀'.repeat(65_536),checklist:[]});assert.ok(cachedNoteSize(nearPreviousLimit)>256*1024);assert.ok(cachedNoteSize(nearPreviousLimit)<MAX_CACHED_NOTE_BYTES);assert.ok(new TextEncoder().encode(nearPreviousLimit.text).byteLength>nearPreviousLimit.text.length);
 const maximumApiTextAscii=projectCachedNote({...base,text:'x'.repeat(1_000_000),checklist:[]});assert.ok(cachedNoteSize(maximumApiTextAscii)<=MAX_CACHED_NOTE_BYTES);
 const validApiButJsonExpanded=projectCachedNote({...base,text:'\n'.repeat(600_000),checklist:[]});assert.equal(new TextEncoder().encode(validApiButJsonExpanded.text).byteLength,600_000);assert.ok(cachedNoteSize(validApiButJsonExpanded)>MAX_CACHED_NOTE_BYTES);
 const aboveCacheLimit=projectCachedNote({...base,text:'x'.repeat(1_100_000),checklist:[]});assert.ok(cachedNoteSize(aboveCacheLimit)>MAX_CACHED_NOTE_BYTES);
 const largeChecklist=projectCachedNote({...base,text:'',checklist:Array.from({length:200},(_,i)=>({id:'c'+i,text:'c'.repeat(2000),checked:false}))});assert.ok(cachedNoteSize(largeChecklist)<MAX_CACHED_NOTE_BYTES);
});
test('aggregate content evicts oldest current notes under the finite byte budget',()=>{
 let content={};for(let i=0;i<5;i++){const result=retainContentEntry(content,'note-'+i,{note:{id:'note-'+i},bytes:900_000,usedAt:i});content=result.content;}
 assert.deepEqual(Object.keys(content),['note-1','note-2','note-3','note-4']);assert.equal(Object.values(content).reduce((sum,item)=>sum+item.bytes,0),3_600_000);assert.ok(Object.values(content).reduce((sum,item)=>sum+item.bytes,0)<=MAX_CACHED_CONTENT_BYTES);
 const oversized=retainContentEntry(content,'too-large',{note:{},bytes:MAX_CACHED_NOTE_BYTES+1,usedAt:6});assert.equal(oversized.stored,false);assert.equal(oversized.reason,'note_too_large');assert.equal(Object.hasOwn(oversized.content,'too-large'),false);
});
test('reopen stays reusable after a list refresh only when server revision still matches',()=>{
 const cached={id:'synthetic',revision:'epoch:4',title:'Fixture',text:'small',checklist:[],history:[]};
 const persisted={note:cached,usedAt:1};assert.equal(reusableNote(persisted.note,{id:'synthetic',revision:'epoch:4'}),true);
 const afterRefresh={id:'synthetic',revision:'epoch:4'};assert.equal(reusableNote(persisted.note,afterRefresh),true);
 assert.equal(reusableNote(persisted.note,{id:'synthetic',revision:'epoch:5'}),false);
 assert.equal(reusableNote(persisted.note,undefined),false);
});
