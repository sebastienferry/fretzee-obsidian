import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { DeviceConnection } from '../.test-build/device-connection.mjs';
const origin='https://studio.example';const token='fup_'+'b'.repeat(32);const code='fda_'+'a'.repeat(32);
function fixture(){let site=origin;const stored=[];const requests=[];let response=async()=>({status:201,json:{token}});const connection=new DeviceConnection(async()=>site,async(origin,token)=>stored.push({origin,token}),async request=>{requests.push(request);return response(request)},()=>webcrypto);return{connection,stored,requests,setSite:value=>site=value,setResponse:value=>response=value};}

test('uses a configurable origin, external callback state and S256 proof without credentials in URLs',async()=>{
 const f=fixture();const request=await f.connection.start(origin,'My Vault');const url=new URL(request.url);
 assert.equal(url.origin,origin);assert.equal(url.pathname,'/connect-device');assert.equal(url.searchParams.get('vault'),'My Vault');assert.equal(f.requests.length,0);
 assert.equal(request.displayCode,url.searchParams.get('state').slice(0,8).toUpperCase());
 assert.equal(await f.connection.complete({state:url.searchParams.get('state'),code}),true);
 const exchange=f.requests[0];assert.equal(exchange.url,origin+'/api/v1/documents/devices/exchange');assert.equal(exchange.headers.Authorization,undefined);
 const {verifier}=JSON.parse(exchange.body);const digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
 assert.equal(digest,url.searchParams.get('challenge'));assert.equal(request.url.includes(verifier),false);assert.equal(request.url.includes(token),false);assert.deepEqual(f.stored,[{origin,token}]);
 await assert.rejects(f.connection.complete({state:url.searchParams.get('state'),code}),/matching/);assert.equal(f.requests.length,1);
});
test('rejects unexpected callbacks, cancellation and expired local requests without transport',async()=>{
 for(const mode of ['state','cancel','expired','denied']){
  const f=fixture();const request=await f.connection.start(origin,'Vault');const state=new URL(request.url).searchParams.get('state');
  if(mode==='cancel')f.connection.cancel();
  if(mode==='expired'){const now=Date.now;Date.now=()=>now()+600001;try{await assert.rejects(f.connection.complete({state,code}),/matching/)}finally{Date.now=now}}
  else if(mode==='denied')assert.equal(await f.connection.complete({state,error:'access_denied'}),false);
  else await assert.rejects(f.connection.complete({state:mode==='state'?'foreign':state,code}),/matching/);
  assert.equal(f.requests.length,0);assert.deepEqual(f.stored,[]);
 }
});
test('changing URL or unloading during exchange cannot store a returned credential',async()=>{
 for(const cancel of [false,true]){
  const f=fixture();const request=await f.connection.start(origin,'Vault');const state=new URL(request.url).searchParams.get('state');
  f.setResponse(async()=>{if(cancel)f.connection.cancel();else f.setSite('https://other.example');return{status:201,json:{token}}});
  await assert.rejects(f.connection.complete({state,code}),/cancelled|changed/);assert.deepEqual(f.stored,[]);
 }
 const f=fixture();const request=await f.connection.start(origin,'Vault');f.setSite('https://other.example');
 await assert.rejects(f.connection.complete({state:new URL(request.url).searchParams.get('state'),code}),/site changed/);assert.equal(f.requests.length,0);
});
test('refused exchanges, malformed credentials and replaced requests are not accepted',async()=>{
 for(const response of [{status:400,json:{}},{status:201,json:{token:'not a token'}}]){
  const f=fixture();const first=await f.connection.start(origin,'Vault');const second=await f.connection.start(origin,'Vault');
  await assert.rejects(f.connection.complete({state:new URL(first.url).searchParams.get('state'),code}),/matching/);
  f.setResponse(async()=>response);await assert.rejects(f.connection.complete({state:new URL(second.url).searchParams.get('state'),code}));assert.deepEqual(f.stored,[]);
 }
});

test('cancelling while a destination check is pending cannot persist a credential',async()=>{
 let release;let checks=0;const stored=[];
 const connection=new DeviceConnection(async()=>{checks++;return checks===2?new Promise(resolve=>release=resolve):origin},async(site,token)=>stored.push({site,token}),async()=>({status:201,json:{token}}),()=>webcrypto);
 const request=await connection.start(origin,'Vault');const promise=connection.complete({state:new URL(request.url).searchParams.get('state'),code});
 await new Promise(resolve=>setImmediate(resolve));assert.ok(release);connection.cancel();release(origin);
 await assert.rejects(promise,/cancelled/);assert.deepEqual(stored,[]);
});

test('simultaneous callbacks start only one exchange',async()=>{
 const f=fixture();const request=await f.connection.start(origin,'Vault');const params={state:new URL(request.url).searchParams.get('state'),code};
 const outcomes=await Promise.allSettled([f.connection.complete(params),f.connection.complete(params)]);
 assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,1);assert.equal(f.requests.length,1);assert.equal(f.stored.length,1);
});
