import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {verifyHomepageGateway} from '../lib/homepage-gateway.mjs';
import {createPreviewHandler} from '../lib/preview-api.mjs';
const key='s'.repeat(64),version='a'.repeat(64),now=()=>Date.now();
const env=()=>({VERCEL_ENV:'production',NOTES_AUTH_SERVICE_KEY:key});
function signed({route='notes',method='GET',body='',age=0}={}){const url='https://notes.test/api/app?route='+route,at=String(Math.floor(Date.now()/1000)-age),signature=createHmac('sha256',key).update(JSON.stringify(['notes-gateway-v1',method,new URL(url).pathname+new URL(url).search,createHash('sha256').update(body).digest('hex'),version,at])).digest('hex');return new Request(url,{method,headers:{'X-Homepage-Version':version,'X-Homepage-At':at,'X-Homepage-Signature':signature,Origin:'https://notes.test','Content-Type':'application/json'},...(body?{body}:{})});}
test('gateway accepts bound grant but rejects tampering and expired/future grants',async()=>{
 assert.deepEqual(await verifyHomepageGateway(signed(),{env,now}),{version});
 for(const r of [signed({age:65}),signed({age:-30}),new Request('https://notes.test/api/app?route=trash',{headers:signed().headers}),new Request('https://notes.test/api/app?route=notes',{method:'POST',headers:signed().headers,body:'{}'})])await assert.rejects(verifyHomepageGateway(r,{env,now}),e=>e.status===401);
 assert.equal(await verifyHomepageGateway(new Request('https://notes.test/api/app'),{env}),null);
});
test('central mode never accepts legacy cookies/password; signed owner gets data, share route remains capability based',async()=>{
 let reads=0;const cfg={origin:'https://notes.test',homepageGateway:true,sharedAuth:true,sessionPassword:'x'.repeat(40),namespace:'synthetic',portalPassword:'',cookieName:'__Host-test'};
 const store={metrics:[],list:async()=>{reads++;return [];},folderNames:async()=>[],close:async()=>{}};
 const handler=createPreviewHandler({env,config:()=>({...cfg}),makeStore:async()=>store,observe:()=>{}});
 assert.equal((await handler(signed())).status,200);assert.equal(reads,1);
 assert.equal((await handler(new Request('https://notes.test/api/app?route=notes',{headers:{cookie:'__Host-test=legacy'}}))).status,401);assert.equal(reads,1);
 const response=await handler(new Request('https://notes.test/api/app?route=auth'));assert.deepEqual(await response.json(),{authenticated:false});
 assert.equal((await handler(new Request('https://notes.test/api/app?route=auth',{method:'POST',headers:{Origin:cfg.origin,'Content-Type':'application/json'},body:JSON.stringify({password:'old'})}))).status,405);
 assert.equal((await handler(new Request('https://notes.test/api/app?route=shared-note'))).status,403);
});
