(()=>{
  const isSub=/\/(about|services|team|contact|quote)\//.test(location.pathname);
  const root=isSub?'../':'';

  // Critical CSS inline so the mobile nav never renders off-screen before the stylesheet loads.
  if(!document.getElementById('ym-shell-critical')){
    const critical=document.createElement('style');
    critical.id='ym-shell-critical';
    critical.textContent=`
html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
.ym-site-header{position:fixed!important;top:12px!important;left:14px!important;right:14px!important;width:auto!important;max-width:none!important;margin:0!important;transform:none!important;z-index:1000!important;box-sizing:border-box!important}
.ym-nav{width:100%!important;height:52px!important;display:flex!important;align-items:center!important;gap:8px!important;padding:5px 8px!important;border:1px solid #aeb7b1!important;border-radius:999px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 3px 12px rgba(0,0,0,.12)!important;box-sizing:border-box!important}
.ym-brand{display:flex!important;align-items:center!important;gap:6px!important;color:#080b09!important;text-decoration:none!important;font:700 13px Arial,Helvetica,sans-serif!important;white-space:nowrap!important}
.ym-brand img{width:30px!important;height:30px!important;border-radius:50%!important;object-fit:contain!important}
.ym-links{display:none!important}
.ym-links.is-open{display:flex!important;position:absolute!important;top:60px!important;left:0!important;right:0!important;flex-direction:column!important;gap:12px!important;padding:14px!important;background:#fff!important;border:1px solid #d9e0db!important;border-radius:16px!important;box-shadow:0 12px 28px rgba(0,0,0,.13)!important;z-index:1001!important}
.ym-links a{color:#313632!important;font:600 14px Arial,Helvetica,sans-serif!important;text-decoration:none!important}
.ym-quote{display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:auto!important;min-height:34px!important;padding:0 12px!important;border-radius:999px!important;background:#16d85a!important;color:#062312!important;font:700 11px Arial,Helvetica,sans-serif!important;text-decoration:none!important;white-space:nowrap!important}
.ym-menu{display:block!important;width:38px!important;height:38px!important;border:0!important;background:transparent!important;padding:0!important;cursor:pointer!important;flex-shrink:0!important}
.ym-menu span{display:block!important;width:22px!important;height:2px!important;margin:4px auto!important;background:#080b09!important;border-radius:2px!important}
body.ym-is-subpage{padding-top:100px!important}
@media(min-width:901px){
  .ym-site-header{top:22px!important;left:24px!important;right:24px!important}
  .ym-nav{height:58px!important;gap:12px!important}
  .ym-links{display:flex!important;position:static!important;flex:1!important;justify-content:center!important;align-items:center!important;gap:clamp(14px,2.5vw,38px)!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;flex-direction:row!important}
  .ym-links a{font-size:12px!important}
  .ym-menu{display:none!important}
  .ym-quote{min-height:38px!important;padding:0 16px!important;font-size:12px!important}
  body.ym-is-subpage{padding-top:118px!important}
}`;
    document.head.appendChild(critical);
  }

  const stylesheet=document.createElement('link');
  stylesheet.rel='stylesheet';
  stylesheet.href=root+'site-shell.css';
  document.head.appendChild(stylesheet);

  const path=location.pathname;
  const isHome=!isSub;
  const active=isHome?'home':(path.match(/\/(about|services|team|contact|quote)\//)||[])[1];

  document.documentElement.classList.add('ym-shell');
  document.body.classList.add('ym-shell', isHome?'ym-is-home':'ym-is-subpage');

  const links=[['home','Home','index.html'],['about','About','about/index.html'],['services','Services','services/index.html'],['team','Team','team/index.html'],['contact','Contact','contact/index.html']]
    .map(([key,label,url])=>`<a href="${root}${url}"${key===active?' aria-current="page"':''}>${label}</a>`)
    .join('');

  const header=`<header class="ym-site-header"><nav class="ym-nav" aria-label="Primary navigation"><a class="ym-brand" href="${root}index.html"><img src="${root}assets/logo.png" alt="YM Logistics logo"><span>YM Logistics</span></a><div class="ym-links">${links}</div><a class="ym-quote" href="${root}quote/index.html">Request quote</a><button type="button" class="ym-menu" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button></nav></header>`;

  const footer=`<footer class="ym-footer"><div class="ym-footer-card"><div><h3>YM Logistics</h3><p>Reliable logistics solutions<br>connecting Ethiopia with global<br>markets.</p></div><div><h4>Quick Links</h4><a href="${root}index.html">Home</a><a href="${root}about/index.html">About</a><a href="${root}services/index.html">Services</a><a href="${root}contact/index.html">Contact</a></div><div><h4>Services</h4><a href="${root}services/index.html">Air Freight</a><a href="${root}services/index.html">Sea Freight</a><a href="${root}services/index.html">Customs Clearance</a><a href="${root}services/index.html">Transportation</a></div><div><h4>Contact</h4><a href="tel:+251944308117">+251 94 430 8117</a><a href="mailto:info@ymlogistics.com">info@ymlogistics.com</a><span>Addis Ababa, Ethiopia</span></div></div><div class="ym-footer-word">YM LOGISTICS</div></footer>`;

  const oldHeader=document.querySelector('header');
  if(oldHeader) oldHeader.outerHTML=header;
  else document.body.insertAdjacentHTML('afterbegin',header);

  const oldFooter=document.querySelector('footer');
  if(oldFooter) oldFooter.outerHTML=footer;
  else document.body.insertAdjacentHTML('beforeend',footer);

  const button=document.querySelector('.ym-menu');
  const menu=document.querySelector('.ym-links');
  if(button&&menu){
    button.addEventListener('click',(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const open=menu.classList.toggle('is-open');
      button.setAttribute('aria-expanded',String(open));
    });
    menu.addEventListener('click',()=>{
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded','false');
    });
  }
})();
