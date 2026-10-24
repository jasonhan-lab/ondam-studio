import path from'node:path';
import{spawn}from'node:child_process';import{readFileSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import assert from'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url)),manifest=JSON.parse(readFileSync(new URL('../BUILD-MANIFEST.json',import.meta.url),'utf8'));
const server=spawn(process.execPath,[fileURLToPath(new URL('./preview-pages.mjs',import.meta.url))],{cwd:root,env:{...process.env,PAGES_PREVIEW_PORT:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']});let checks=0;
try{
 const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Preview startup timeout')),10000);server.once('error',reject);server.once('exit',code=>{if(code)reject(Error('Preview exited'));});server.stdout.on('data',chunk=>{output+=chunk.toString();const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/daypayroll\//);if(m){clearTimeout(timer);resolve(m[0]);}});});
 for(const file of manifest.files){const r=await fetch(base+file.name);assert.equal(r.status,200,file.name);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,file.bytes);if(file.sha256)assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);if(file.name.endsWith('.mjs'))assert.match(r.headers.get('content-type'),/javascript/);checks++;}
 const outputRoot=fileURLToPath(new URL('../_site/',import.meta.url));const actual=readdirSync(outputRoot,{recursive:true,withFileTypes:true}).filter(f=>f.isFile()).map(f=>path.relative(outputRoot,path.join(f.parentPath,f.name)).split(path.sep).join('/'));assert.deepEqual(actual.sort(),manifest.files.map(f=>f.name).sort());checks++;
 for(const name of ['.env','README.md','SOURCE-MANIFEST.json','source/index.html','preview/index.html','verification/static-check.mjs','api/payroll','haru-workers-payroll.json']){const r=await fetch(base+name);assert.equal(r.status,404,name);checks++;}
 assert.equal((await fetch(new URL('/',base))).status,404);checks++;
 assert.equal((await fetch(base,{method:'POST',body:'fake-payroll-data'})).status,405);checks++;
 const html=await(await fetch(base)).text();for(const m of html.matchAll(/href="#([^"]+)"/g)){assert.ok(html.includes('id="'+m[1]+'"'),m[1]);checks++;}
 for(const file of manifest.files){if(file.name==='.nojekyll')continue;const source=readFileSync(new URL('../'+file.name,import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),file.sha256,file.name);checks++;}
 console.log('정적 하위 경로·파일 해시·MIME·앵커·비공개 파일 제외·원본 보존 검사 '+checks+'건 통과');
}finally{server.kill();}
