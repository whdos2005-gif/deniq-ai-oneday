try{
 const r=await fetch('./course.json',{cache:'no-store'});if(!r.ok)throw Error();
 const c=await r.json();const u=new URL(c.adminUrl);
 if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.pathname!=='/admin')throw Error();
 const link=document.querySelector('#admin-open');link.href=u.href;link.hidden=false;
 document.querySelector('#admin-status').textContent='보호된 관리자 페이지로 이동합니다.';window.location.replace(u.href);
}catch{document.querySelector('#admin-status').textContent='관리자 페이지 연결을 준비하고 있습니다.';}
