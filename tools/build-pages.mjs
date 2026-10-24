import{readdirSync,readFileSync,writeFileSync,mkdirSync,copyFileSync,lstatSync,existsSync}from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.join(root,'_site');
const allowed=/\.(?:html|css|mjs|js|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|xml|txt)$/i;
const seeds=['index.html','style.css',...['robots.txt','sitemap.xml'].filter(n=>existsSync(path.join(root,n))),...readdirSync(root).filter(n=>/^payroll-.*\.mjs$/.test(n)&&!n.endsWith('.test.mjs'))];
const queue=[...new Set(seeds)],files=new Map();const externalLinks=new Set();
function add(reference,from){if(!reference||reference.startsWith('#')||/^(?:data:|blob:)/.test(reference))return;if(/^https?:\/\//.test(reference)){externalLinks.add(reference);return;}if(/^(?:\/|[a-z]+:)/i.test(reference))throw Error('정적 하위 경로에 맞지 않는 주소: '+reference);const name=path.posix.normalize(path.posix.join(path.posix.dirname(from),decodeURIComponent(reference.split(/[?#]/)[0])));if(name.startsWith('../')||name==='..'||name.split('/').some(n=>n.startsWith('.'))||!allowed.test(name)||name.endsWith('.test.mjs'))throw Error('배포 허용 범위 밖의 파일 참조: '+name);if(!files.has(name)&&!queue.includes(name))queue.push(name);}
for(let index=0;index<queue.length;index++){
 const name=queue[index],file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!existsSync(file)||!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink())throw Error('참조 파일 누락 또는 안전하지 않은 경로: '+name);
 const bytes=readFileSync(file);files.set(name,bytes);if(!/\.(?:html|css|mjs|js|svg)$/.test(name))continue;const text=bytes.toString('utf8');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|\bAKIA[A-Z0-9]{16}|\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(text))throw Error('비밀정보 형태가 감지되어 빌드를 중단합니다: '+name);
 if(/\.(?:mjs|js)$/.test(name)){
  if(/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|navigator\.sendBeacon|\bprocess\.env|import\.meta\.env|\bimport\s*\(\s*[^'"\s]/.test(text))throw Error('서버·동적 네트워크 의존성은 별도 검토가 필요합니다: '+name);
  for(const m of text.matchAll(/(?:^|[;\r\n])\s*(?:import|export)\s+(?:[^;'"\r\n]*?\sfrom\s*)?['"]([^'"]+)['"]/g)){if(!m[1].startsWith('.'))throw Error('번들링되지 않은 모듈: '+m[1]);add(m[1],name);}
 }
 if(/\.(?:html|svg)$/.test(name))for(const m of text.matchAll(/\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/g))add(m[1],name);
 if(name.endsWith('.css'))for(const m of text.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g))add(m[1],name);
}
mkdirSync(output,{recursive:true});const expected=new Set([...files.keys(),'.nojekyll']);for(const n of readdirSync(output))if(![...expected].some(name=>name===n||name.startsWith(n+'/')))throw Error('이전 산출물에 알 수 없는 파일이 있습니다. 새 빈 _site 폴더를 사용해주세요: '+n);
for(const[name,bytes]of files){const target=path.join(output,name);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(path.join(root,name),target);}writeFileSync(path.join(output,'.nojekyll'),'');
const manifest=[...files].map(([name,bytes])=>({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})).sort((a,b)=>a.name.localeCompare(b.name));
writeFileSync(path.join(root,'BUILD-MANIFEST.json'),JSON.stringify({sourceCommit:process.env.GITHUB_SHA||process.env.SOURCE_COMMIT||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),siteUrl:'https://jasonhan-lab.github.io/daypayroll/',files:[...manifest,{name:'.nojekyll',bytes:0}],totalBytes:manifest.reduce((sum,f)=>sum+f.bytes,0),externalLinks:[...externalLinks],note:'검증 로그·원본·저장 기록·테스트·설정 파일은 사이트 산출물에 포함하지 않습니다.'},null,2));
console.log('정적 빌드 완료: '+(files.size+1)+' files / '+manifest.reduce((sum,f)=>sum+f.bytes,0)+' bytes / '+output);
