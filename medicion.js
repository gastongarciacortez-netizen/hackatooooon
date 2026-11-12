// V10: grabador de caminata GPS. No sustituye una medición topográfica.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ESCALA = 'ucb_escala_m_por_unidad_v10';
  const distGPS=(a,b)=>{
    const R=6371000, rad=Math.PI/180;
    const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  };
  let watch=null,active=false,metres=0,accepted=[],rejected=0,started=null,ended=null,tick=null;
  const format=n=>n.toLocaleString('es-BO',{minimumFractionDigits:1,maximumFractionDigits:1});
  function seconds(){return started?Math.max(0,Math.floor(((active?Date.now():ended)||Date.now()-started)/1000)):0;}
  function elapsed(){return started?Math.floor(((active?Date.now():ended)-started)/1000):0;}
  function timer(){const t=elapsed();$('med-tiempo').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
  function update(){ $('med-metros').textContent=format(metres)+' m';$('med-puntos').textContent=String(accepted.length);timer();}
  function pos(p){
    if(!active)return;
    const lat=p.coords.latitude,lon=p.coords.longitude,acc=p.coords.accuracy,ts=p.timestamp;
    $('med-precision').textContent=`±${Math.round(acc)} m`;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(acc)||acc>20){rejected++;$('med-estado').textContent=`GPS activo. Lectura descartada (precisión ±${Math.round(acc)} m). Busca cielo despejado.`;return;}
    const current={lat,lon,accuracy:acc,ts};const last=accepted[accepted.length-1];
    if(last){
      const dt=(ts-last.ts)/1000;
      if(dt<=0)return;
      const d=distGPS(last,current),speed=d/dt;
      if(speed>3.5){rejected++;$('med-estado').textContent='Se descartó un salto GPS de velocidad improbable al caminar.';return;}
      // Evitar acumular fluctuaciones pequeñas de GPS mientras el móvil permanece quieto.
      if(d<Math.max(5,(acc+last.accuracy)*0.6))return;
      metres+=d;
    }
    accepted.push(current);update();
    $('med-estado').textContent=`Grabando... ${accepted.length} lecturas aceptadas, ${rejected} descartadas. Mantén la pantalla activa.`;
  }
  function stop(){
    if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}
    if(tick){clearInterval(tick);tick=null;}
    active=false;ended=Date.now();$('med-iniciar').disabled=false;$('med-detener').disabled=true;
    $('med-export').disabled=!accepted.length;update();
    if(metres>0)$('med-real').value=metres.toFixed(1);
    $('med-estado').textContent=`Medición finalizada: ${format(metres)} m (GPS filtrado), ${accepted.length} puntos válidos. Verifica que coincida con el trayecto realmente caminando.`;
  }
  $('med-iniciar').onclick=()=>{
    if(!navigator.geolocation){$('med-estado').textContent='Este navegador no admite geolocalización.';return;}
    if(!isSecureContext){$('med-estado').textContent='Para registrar GPS abre el sitio mediante HTTPS o localhost.';return;}
    if(accepted.length||started){if(!confirm('¿Comenzar una nueva medición y reemplazar la anterior? Descarga antes la anterior si la necesitas.'))return;}
    metres=0;accepted=[];rejected=0;started=Date.now();ended=null;active=true;
    $('med-iniciar').disabled=true;$('med-detener').disabled=false;$('med-export').disabled=true;
    $('med-real').value='';$('med-precision').textContent='Esperando GPS';update();
    $('med-estado').textContent='Grabando: camina desde el ingreso hacia el acceso exterior de Biblioteca. No bloquees la pantalla.';
    watch=navigator.geolocation.watchPosition(pos,e=>{
      $('med-estado').textContent=`Error GPS: ${e.message}. Comprueba permisos y ubicación precisa.`;
      if(e.code===1)stop();
    },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    tick=setInterval(timer,1000);
  };
  $('med-detener').onclick=stop;
  $('med-reset').onclick=()=>{
    if(active)stop();metres=0;accepted=[];rejected=0;started=null;ended=null;
    $('med-real').value='';$('med-precision').textContent='Sin datos';$('med-export').disabled=true;
    $('med-estado').textContent='Medición reiniciada. La escala ya guardada no se elimina.';update();
  };
  $('med-export').onclick=()=>{
    const obj={tipo:'medicion_gps_ucb',version:1,inicio:new Date(started).toISOString(),fin:new Date(ended||Date.now()).toISOString(),distanciaFiltradaMetros:metres,puntosAceptados:accepted,lecturasDescartadas:rejected,advertencia:'Contiene coordenadas personales. No publicar este archivo.'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='medicion-caminata-ucb.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  function showScale(){
    const f=Number(localStorage.getItem(ESCALA));
    $('med-escala').textContent=Number.isFinite(f)&&f>0?`Escala activa: 1 unidad del plano ≈ ${f.toFixed(4)} metros. Las rutas muestran metros y tiempo estimados a 1,2 m/s.`:'Sin escala guardada. Las rutas se muestran en unidades del plano.';
  }
  $('med-calibrar').onclick=()=>{
    if(active){$('med-estado').textContent='Detén primero la medición.';return;}
    const real=Number($('med-real').value);
    const unidades=window.UCBRed?.distanciaIngresoBiblioteca?.();
    if(!Number.isFinite(real)||real<=0){$('med-estado').textContent='Ingresa una distancia real positiva.';return;}
    if(!Number.isFinite(unidades)||unidades<=0){$('med-estado').textContent='No existe una ruta conectada ingreso → Biblioteca en la red actual.';return;}
    const factor=real/unidades;
    if(!confirm(`¿Confirmas que caminaste exactamente del Ingreso principal al acceso exterior de Biblioteca siguiendo la ruta marcada?\n${real.toFixed(1)} m GPS / ${unidades.toFixed(1)} unidades = ${factor.toFixed(4)} m/unidad.`))return;
    localStorage.setItem(ESCALA,String(factor));showScale();window.UCBRed?.recalcular?.();
    $('med-estado').textContent='Escala provisional guardada en este navegador. Verifica con una segunda ruta independiente antes de usarla como distancia real.';
  };
  $('med-borrar-escala').onclick=()=>{localStorage.removeItem(ESCALA);showScale();window.UCBRed?.recalcular?.();$('med-estado').textContent='Escala eliminada.';};
  window.addEventListener('pagehide',()=>{if(active)stop();});
  showScale();update();
})();
