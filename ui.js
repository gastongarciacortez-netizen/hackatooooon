(() => {
  'use strict';
  const KEY_MODE='ucb_ui_presentation_v11';
  const KEY_RED='ucb_ui_show_red_v11';
  const body=document.body;
  const btnModo=document.getElementById('toggle-presentacion');
  const btnRed=document.getElementById('toggle-red');
  const details=document.getElementById('herramientas-avanzadas');

  function setTexts(){
    const presentacion=body.classList.contains('modo-presentacion');
    const mostrarRed=body.classList.contains('mostrar-red-tecnica');
    btnModo.textContent=presentacion?'Modo presentación':'Modo edición visual';
    btnRed.textContent=mostrarRed?'Ocultar red técnica':'Mostrar red técnica';
    btnRed.disabled=!presentacion;
  }

  try{
    const modo=localStorage.getItem(KEY_MODE);
    const red=localStorage.getItem(KEY_RED);
    if(modo==='off') body.classList.remove('modo-presentacion');
    if(red==='on') body.classList.add('mostrar-red-tecnica');
  }catch(_){ }

  btnModo.addEventListener('click',()=>{
    body.classList.toggle('modo-presentacion');
    if(!body.classList.contains('modo-presentacion')) body.classList.add('mostrar-red-tecnica');
    try{localStorage.setItem(KEY_MODE, body.classList.contains('modo-presentacion') ? 'on' : 'off');}catch(_){ }
    setTexts();
  });

  btnRed.addEventListener('click',()=>{
    body.classList.toggle('mostrar-red-tecnica');
    try{localStorage.setItem(KEY_RED, body.classList.contains('mostrar-red-tecnica') ? 'on' : 'off');}catch(_){ }
    setTexts();
  });

  // Si el usuario empieza a editar, abre las herramientas avanzadas automáticamente.
  ['editar','red-dibujar','red-vincular','gps-calibrar','med-iniciar'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click',()=>{ details.open=true; body.classList.add('mostrar-red-tecnica'); try{localStorage.setItem(KEY_RED,'on');}catch(_){ } setTexts(); });
  });

  setTexts();
})();
