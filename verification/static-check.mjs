// Trusted validator. Never imports or executes a file from the generated project.
import {readdirSync,readFileSync,lstatSync} from 'node:fs';import path from 'node:path';
const root=process.argv[2],mode=process.argv[3];if(!['build','test'].includes(mode))process.exit(2);
const files=readdirSync(root).filter(n=>/^[a-zA-Z0-9_-]+\.(html|css|svg)$/.test(n));const issues=[];
if(!files.includes('index.html')&&!files.some(n=>n.endsWith('.svg')))issues.push('index.html 또는 SVG가 없습니다.');
for(const name of files){const p=path.join(root,name),s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.nlink>1||s.size>65536){issues.push('파일 권한 또는 크기 오류');continue;}const source=readFileSync(p,'utf8');if(name.endsWith('.html')){if(!/<h1\b/.test(source))issues.push('대표 제목 h1이 필요합니다.');if(/<img\b(?![^>]*\balt="[^"]+")[^>]*>/i.test(source))issues.push('이미지 대체 텍스트가 필요합니다.');if(!/<main\b/.test(source))issues.push('본문 main 영역이 필요합니다.');}if(name.endsWith('.css')&&source.split('{').length!==source.split('}').length)issues.push('CSS 괄호 수가 일치하지 않습니다.');}
console.log(JSON.stringify({command:mode,passed:issues.length===0,issues,files,scope:'정적 구조·접근성 기본 검사. JavaScript 실행·TypeScript 검사·상호작용 테스트가 아닙니다.'}));process.exitCode=issues.length?1:0;
