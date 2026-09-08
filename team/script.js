const menu=document.querySelector('.menu'); if(menu){menu.addEventListener('click',()=>{document.querySelectorAll('.links').forEach(x=>x.classList.toggle('open'));});}
