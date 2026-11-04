import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {StoreError} from './store.mjs';
export async function verifyHomepageGateway(request,{env=()=>process.env,now=Date.now}={}){
 const e=env(),key=e.NOTES_AUTH_SERVICE_KEY,version=request.headers.get('x-homepage-version'),at=request.headers.get('x-homepage-at'),signature=request.headers.get('x-homepage-signature');
 if(!signature)return null;
 const fail=()=>{throw new StoreError(401,'LOGIN_REQUIRED');};
 if(e.VERCEL_ENV!=='production'||typeof key!=='string'||key.length<64||!/^([a-f0-9]{64}|[a-f0-9-]{36})$/.test(version||'')||!/^\d{10}$/.test(at||'')||! /^[a-f0-9]{64}$/.test(signature))fail();
 const age=now()/1000-Number(at);if(age>60||age< -5)fail();
 const url=new URL(request.url),payload=request.method==='GET'?'':await request.clone().text();
 if(Buffer.byteLength(payload)>3_000_000)fail();
 const hash=createHash('sha256').update(payload).digest('hex');
 const expected=createHmac('sha256',key).update(JSON.stringify(['notes-gateway-v1',request.method,url.pathname+url.search,hash,version,at])).digest('hex');
 if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex')))fail();
 return {version};
}
