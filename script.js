const menuBtn=document.querySelector('.menu-btn');const mobileMenu=document.querySelector('.mobile-menu');
menuBtn?.addEventListener('click',()=>{const open=mobileMenu.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>mobileMenu.classList.remove('open')));

// Pause the globe orbit while a visitor reads one of the "Why choose us" cards.
const orbit=document.querySelector('.orbit-container');
document.querySelectorAll('.why-card').forEach(card=>{
  card.tabIndex=0;
  card.setAttribute('role','button');
  card.setAttribute('aria-pressed','false');
  const select=()=>{
    const isActive=!card.classList.contains('active');
    document.querySelectorAll('.why-card').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-pressed','false');});
    if(isActive){card.classList.add('active');card.setAttribute('aria-pressed','true');}
    if(orbit) orbit.classList.toggle('is-paused',isActive);
  };
  card.addEventListener('click',select);
  card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
});
