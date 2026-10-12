import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
const MAX=20*1024*1024;
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function password(p:string,s:string){const k=await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(s),iterations:100000,hash:'SHA-256'},k,256));}
const json=(v:any,status=200,headers:any={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
function fail(s:string,n=400):never{throw Object.assign(new Error(s),{status:n});};
const safe=(v:unknown,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('Isian tidak valid.');return (v as string).trim();};
const staff=(v:unknown)=>{const n=Number(v);if(!Number.isInteger(n)||n<1||n>4)fail('Pilih staf 1–4.');return n;};
async function handle(req:Request){
 const db=env.DB!,bucket=env.BUCKET!;
 try{
 const path=new URL(req.url).pathname.slice(5).split('/'); const action=path[0];
 const uid=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');
 const all=async(sql:string,...args:any[])=>(await db.prepare(sql).bind(...args).all()).results as any[];
 const one=async(sql:string,...args:any[])=>db.prepare(sql).bind(...args).first<any>();
 const run=async(sql:string,...args:any[])=>db.prepare(sql).bind(...args).run();
 const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('yp_session='))?.slice(11);
 let me:any=null;
 if(uid&&cookie){me=await one('SELECT m.* FROM members m JOIN sessions s ON m.id=s.uid WHERE s.token=? AND s.uid=? AND s.expires>?',await hash(cookie),uid,Date.now());if(me?.status!=='approved')me=null;}
 const clean=(m:any)=>m?({id:m.id,name:m.name,email:m.email,staff:m.staff,role:m.role,status:m.status}):null;
 if(req.method==='GET'&&action==='public')return json({settings:JSON.parse((await one('SELECT data FROM settings WHERE id=1'))?.data||'{}'),posts:await all('SELECT * FROM posts ORDER BY created DESC'),identity:uid?{email}:null,registered:uid?clean(await one('SELECT * FROM members WHERE id=?',uid)):null,needsSetup:email===(env as any).ADMIN_EMAIL&&!(await one('SELECT id FROM bootstrap WHERE id=1')),me:clean(me)});
 if(!uid||!email)fail('Masuk dengan ChatGPT terlebih dahulu.',401);
 if(req.method!=='GET') {if(req.headers.get('origin')!==new URL(req.url).origin)fail('Permintaan ditolak.',403);}
 if(['register','setup','login'].includes(action)&&req.method==='POST'){
 const len=Number(req.headers.get('content-length')||0);if(len>10000)fail('Permintaan terlalu besar.',413);
 const body=await req.json() as any;
 const limkey=uid+':'+action;
 await run('INSERT INTO limits(id,count,until) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END',limkey,Date.now()+900000,Date.now(),Date.now());
 if((await one('SELECT count FROM limits WHERE id=?',limkey)).count>10)fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);
 if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail('Kata sandi harus 12–128 karakter.');
 const existing=await one('SELECT * FROM members WHERE id=?',uid);
 if(action==='login'){
 if(!existing||await password(body.password,existing.salt)!==existing.hash)fail('Kata sandi salah atau akun belum terdaftar.',401);
 if(existing.status!=='approved')fail('Akun menunggu persetujuan atau telah dinonaktifkan.',403);
 const token=crypto.randomUUID()+crypto.randomUUID();await run('INSERT INTO sessions(token,uid,expires) VALUES(?,?,?)',await hash(token),uid,Date.now()+8*3600000);
 await run('DELETE FROM sessions WHERE expires<?',Date.now());
 return json({me:clean(existing)},200,{'Set-Cookie':`yp_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
 }
 if(existing)fail('Akun sudah terdaftar. Silakan masuk.');
 if(action==='setup'&&email!==(env as any).ADMIN_EMAIL)fail('Hanya pemilik portal dapat mengaktifkan admin.',403);
 if(action==='setup'&&(await one('SELECT id FROM bootstrap WHERE id=1')))fail('Admin sudah diaktifkan.',409);
 if(action==='register'&&!(await one('SELECT id FROM bootstrap WHERE id=1')))fail('Admin perlu mengaktifkan portal terlebih dahulu.');
 const name=safe(body.name,80),st=action==='setup'?1:staff(body.staff),salt=crypto.randomUUID(),pw=await password(body.password,salt);
 const q=db.prepare('INSERT INTO members(id,email,name,staff,role,status,salt,hash,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(uid,email,name,st,action==='setup'?'admin':'member',action==='setup'?'approved':'pending',salt,pw,Date.now());
 if(action==='setup')await db.batch([db.prepare('INSERT INTO bootstrap(id,uid) VALUES(1,?)').bind(uid),q]);else await q.run();
 return json({ok:true});
 }
 if(action==='logout'&&req.method==='POST'){if(cookie)await run('DELETE FROM sessions WHERE token=?',await hash(cookie));return json({ok:true},200,{'Set-Cookie':'yp_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
 if(!me)fail('Silakan login dengan kata sandi portal.',401);
 const admin=me.role==='admin';
 if(action==='dashboard'&&req.method==='GET')return json({me:clean(me),files:await all('SELECT f.*,m.name AS owner FROM files f LEFT JOIN members m ON f.uid=m.id '+(admin?'':'WHERE f.staff=? ')+'ORDER BY f.created DESC',...(admin?[]:[me.staff])),activity:await all('SELECT * FROM activity '+(admin?'':'WHERE staff=? ')+'ORDER BY created DESC LIMIT 12',...(admin?[]:[me.staff])),members:admin?(await all('SELECT * FROM members ORDER BY created DESC')).map(clean):[]});
 const log=async(label:string,st:number)=>run('INSERT INTO activity(id,uid,staff,label,created) VALUES(?,?,?,?,?)',crypto.randomUUID(),uid,st,label,Date.now());
 if(action==='files'){
 if(req.method==='POST'){
 if(Number(req.headers.get('content-length')||0)>MAX+65536)fail('Ukuran maksimal 20 MB.',413);
 const form=await req.formData(),f=form.get('file'),st=staff(form.get('staff'));
 if(!admin&&st!==me.staff)fail('Anda tidak memiliki akses staf ini.',403);
 if(!(f instanceof File)||!f.size||f.size>MAX)fail('Pilih file berukuran 1 byte hingga 20 MB.',413);
 const id=crypto.randomUUID(),name=f.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,180)||'dokumen';
 await bucket.put(id,f.stream(),{httpMetadata:{contentType:'application/octet-stream'}});
 try{await run('INSERT INTO files(id,name,size,staff,uid,created) VALUES(?,?,?,?,?,?)',id,name,f.size,st,uid,Date.now());}catch(e){await bucket.delete(id);throw e;}
 await log('Mengunggah '+name,st);return json({ok:true});
 }
 const f=await one('SELECT * FROM files WHERE id=?',path[1]||'');if(!f)fail('File tidak ditemukan.',404);if(!admin&&f.staff!==me.staff)fail('Akses ditolak.',403);
 if(req.method==='GET'){const obj=await bucket.get(f.id);if(!obj)fail('File tidak ditemukan.',404);return new Response(obj.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 if(req.method==='DELETE'){if(!admin)fail('Hanya admin yang dapat menghapus file.',403);await bucket.delete(f.id);await run('DELETE FROM files WHERE id=?',f.id);await log('Menghapus '+f.name,f.staff);return json({ok:true});}
 }
 if(!admin)fail('Akses admin diperlukan.',403);
 if(action==='members'&&req.method==='PATCH'){
 const b=await req.json() as any;if(!['approved','rejected','pending'].includes(b.status))fail('Status tidak valid.');const target=await one('SELECT * FROM members WHERE id=?',b.id);if(!target||target.role==='admin')fail('Akun admin tidak dapat diubah.');
 await db.batch([db.prepare('UPDATE members SET status=?,staff=? WHERE id=?').bind(b.status,staff(b.staff),b.id),db.prepare('DELETE FROM sessions WHERE uid=?').bind(b.id)]);await log('Memperbarui akses '+target.name,staff(b.staff));return json({ok:true});
 }
 if(action==='settings'&&req.method==='POST'){
 const b=await req.json() as any;const data:any={};for(const k of ['logo','video','ig','fb','tiktok','yt']){const v=String(b[k]||'').trim();if(v){let u;try{u=new URL(v);}catch{fail('URL tidak valid: '+k);}if(u!.protocol!=='https:')fail('Gunakan URL HTTPS.');if(v.length>2000)fail('URL terlalu panjang.');}data[k]=v;}data.profile=String(b.profile||'').slice(0,12000);await run('INSERT INTO settings(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(data));return json({ok:true});
 }
 if(action==='posts'&&req.method==='POST'){const b=await req.json() as any;if(!['berita','publikasi','informasi'].includes(b.type))fail('Kategori tidak valid.');await run('INSERT INTO posts(id,type,title,body,created) VALUES(?,?,?,?,?)',crypto.randomUUID(),b.type,safe(b.title,160),safe(b.body,12000),Date.now());return json({ok:true});}
 if(action==='posts'&&req.method==='DELETE'){await run('DELETE FROM posts WHERE id=?',path[1]);return json({ok:true});}
 return json({error:'Rute tidak ditemukan.'},404);
 }catch(e:any){return json({error:e.status?e.message:'Proses belum berhasil. Silakan coba lagi.'},e.status||500);}
}
export const GET=handle,POST=handle,PATCH=handle,DELETE=handle;
