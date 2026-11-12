// V10.1: incorporamos SOLO el total GPS confirmado, nunca las coordenadas de la caminata.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PRIMERA = 77.284731532895;
  const STORE = 'ucb_caminatas_verificacion_v10_1';
  const format = x => x.toLocaleString('es-BO', {maximumFractionDigits:2,minimumFractionDigits:2});
  try {
    const older=JSON.parse(localStorage.getItem(STORE)||'{}');
    for(const key of ['segunda','tercera']) if(typeof older[key]==='number' && older[key]>0) $('cal-'+key).value=String(older[key]);
  }catch(_){}
  function datos() {
    const nums=[PRIMERA];
    for(const name of ['segunda','tercera']) {
      const raw=$('cal-'+name).value.trim();
      if(!raw)continue;
      const n=Number(raw);
      if(!Number.isFinite(n)||n<=0||n>10000)return null;
      nums.push(n);
    }
    return nums;
  }
  function actualizar() {
    const d=datos();
    if(!d){$('cal-resumen').textContent='Revisa las mediciones: deben ser metros positivos.';return;}
    const promedio=d.reduce((a,b)=>a+b,0)/d.length;
    const amplitud=(Math.max(...d)-Math.min(...d))/promedio;
    const txt=d.length===1?'Solo 1 medición: la escala sigue siendo provisional.':amplitud>0.15?'Variación superior al 15 %. Repite la caminata y revisa el GPS.':'Mediciones relativamente consistentes; falta contrastar otro trayecto independiente.';
    $('cal-resumen').textContent=`${d.length} medición(es). Promedio: ${format(promedio)} m. ${txt}`;
    try{localStorage.setItem(STORE,JSON.stringify({segunda:Number($('cal-segunda').value)||null,tercera:Number($('cal-tercera').value)||null}));}catch(_){}
    return {d,promedio,amplitud};
  }
  for(const name of ['segunda','tercera']) $('cal-'+name).addEventListener('input',actualizar);
  $('cal-usar-promedio').onclick=()=>{
    const z=actualizar();if(!z)return;
    $('med-real').value=z.promedio.toFixed(2);
    if(z.d.length===1) $('med-estado').textContent='Se cargó tu primera medición de 77,28 m. Pulsa «Calibrar escala con esta distancia» si deseas aplicar esta escala PROVISIONAL.';
    else if(z.amplitud>0.15) $('med-estado').textContent='ATENCIÓN: las caminatas difieren mucho; mejor repetir mediciones antes de calibrar.';
    else $('med-estado').textContent='Promedio cargado. Ahora pulsa «Calibrar escala con esta distancia».';
  };
  // No sobrescribir una medición que acaba de hacer el usuario en esta sesión.
  if(!$('med-real').value) $('med-real').value=PRIMERA.toFixed(2);
  actualizar();
})();
