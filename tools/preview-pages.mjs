import http from'node:http';import{readFileSync,existsSync,statSync}from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(fileURLToPath(new URL('../_site/',import.meta.url))),prefix='/daypayroll/',port=Number(process.env.PAGES_PREVIEW_PORT||4177);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((request,response)=>{
 let route;try{route=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400).end();return;}
 response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
 if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405).end();return;}
 if(route==='/__qa__/mobile'){response.setHeader('Content-Type','text/html;charset=utf-8');response.end('<!doctype html><meta charset="utf-8"><title>Pages 390px preview</title><style>body{background:#f5f6f3;font:16px sans-serif}main{width:410px;margin:20px auto}iframe{width:390px;height:1000px;border:1px solid #ccc}</style><main><p>390px · /daypayroll/ 실제 산출물</p><iframe title="모바일 급여 계산기" src="/daypayroll/"></iframe></main>');return;}
 if(!route.startsWith(prefix)){response.writeHead(404).end('Not found');return;}
 const name=route.slice(prefix.length)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile()){response.writeHead(404).end('Not found');return;}
 response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');response.writeHead(200);response.end(request.method==='HEAD'?undefined:readFileSync(file));
});server.listen(port,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+server.address().port+prefix+' (localhost only; not deployed)')); 
