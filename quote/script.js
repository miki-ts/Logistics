document.querySelectorAll('.service').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.service').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}));
document.getElementById('quoteForm').addEventListener('submit',e=>{e.preventDefault();alert('Thank you. Your quote request has been prepared for YM Logistics.');});
document.querySelector('.menu').addEventListener('click',()=>alert('Mobile navigation: Home, About, Services, Team, Contact'));
