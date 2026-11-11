import {cp, mkdir, rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const f of ['index.html','style.css','app.js','assets','robots.txt']) await cp(f,`dist/${f}`,{recursive:true});
console.log('Static demo built in dist/');
