// V7: GPS real con calibración local. No se inventan coordenadas del campus.
(() => {
'use strict';
const svg = document.getElementById('mapa');
const ns = 'http://www.w3.org/2000/svg';
const layerGPS = document.getElementById('capa-ubicacion');
const layerRefs = document.getElementById('capa-referencias');
const $ = id => document.getElementById(id);
const status = $('gps-estado'), data = $('gps-datos'), selectedLabel = $('gps-punto-seleccionado');
const calStatus = $('calibracion-estado'), refsList = $('lista-referencias');
const KEY = 'ucb_gps_calibracion_v7';
let watchId = null, lastPosition = null, pending = null, picking = false;
let refs = [];
let transform = null;
const pointOK = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=942 && p.y>=0 && p.y<=569;
const gpsOK = p => p && Number.isFinite(p.lat) && p.lat>=-90 && p.lat<=90 && Number.isFinite(p.lon) && p.lon>=-180 && p.lon<=180;
function refOK(r) {return pointOK(r) && gpsOK(r);}
try {
  const old = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(old) && old.length<=30 && old.every(refOK)) refs = old;
} catch (_) { /* primera ejecución */ }
function create(tag,attrs,parent){
  const e=document.createElementNS(ns,tag);
  for (const [key,val] of Object.entries(attrs)) e.setAttribute(key,String(val));
  parent.appendChild(e);return e;
}
function planePoint(event) {
  const p = svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
  const matrix=svg.getScreenCTM();return matrix?p.matrixTransform(matrix.inverse()):null;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(refs));}catch(_){status.textContent='No se pudo guardar la calibración en el navegador. Descarga una copia.';}}
function meters(lat,lon,lat0,lon0){
  const r=6371000,rad=Math.PI/180;
  return {e:(lon-lon0)*rad*r*Math.cos(lat0*rad),n:(lat-lat0)*rad*r};
}
function det3(a){return a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);}
// Ajuste afín con tres referencias geográficas no alineadas: [x,y] = A*[este,norte,1]
function calibrate(){
  if(refs.length<3)return null;
  const r=refs.slice(0,3),lat0=r[0].lat,lon0=r[0].lon;
  const m=r.map(p=>{const q=meters(p.lat,p.lon,lat0,lon0);return [q.e,q.n,1];});
  const d=det3(m);
  if(Math.abs(d)<1) return null; // puntos demasiado juntos o alineados, matriz inestable
  const solve = target => [0,1,2].map(col => {
    const t=m.map((row,i)=>row.map((v,j)=>j===col?target[i]:v));
    return det3(t)/d;
  });
  const ax=solve(r.map(p=>p.x)),ay=solve(r.map(p=>p.y));
  return {lat0,lon0,ax,ay, project(lat,lon) {
    const p=meters(lat,lon,lat0,lon0);
    return {x:ax[0]*p.e+ax[1]*p.n+ax[2],y:ay[0]*p.e+ay[1]*p.n+ay[2]};
  },pixelsPerMeter:Math.max(Math.hypot(ax[0],ay[0]),Math.hypot(ax[1],ay[1]))};
}
function drawRefs(){
  layerRefs.replaceChildren();refs.forEach((r,i)=>{
    create('circle',{cx:r.x,cy:r.y,r:6,class:'gps-referencia'},layerRefs);
    const t=create('text',{x:r.x+9,y:r.y-8,class:'gps-etiqueta'},layerRefs);t.textContent=String(i+1);
  });
  if(pending)create('circle',{cx:pending.x,cy:pending.y,r:9,fill:'none',stroke:'#f59e0b','stroke-width':3,'stroke-dasharray':'3 3'},layerRefs);
}
function repaint(){
  transform=calibrate();drawRefs();layerGPS.replaceChildren();
  refsList.replaceChildren();refs.forEach((r,i)=>{
    const li=document.createElement('li');li.textContent=`Ref. ${i+1}: mapa (${r.x}, ${r.y}), GPS (${r.lat.toFixed(6)}, ${r.lon.toFixed(6)})`;refsList.appendChild(li);
  });
  calStatus.textContent=transform
    ?`Calibración activa (${refs.length} referencias; se usan las primeras 3). La precisión depende de las mediciones realizadas.`
    :`${refs.length}/3 referencias. ${refs.length>=3?'Referencias alineadas o muy próximas: borra y repite con tres lugares separados.':'Faltan '+(3-refs.length)+' referencias para ubicar el GPS sobre el plano.'}`;
  if(lastPosition && transform){
    const pos=transform.project(lastPosition.coords.latitude,lastPosition.coords.longitude);
    if(pointOK(pos)){
      const r=Math.max(2,Math.min(200,lastPosition.coords.accuracy*transform.pixelsPerMeter));
      create('circle',{cx:pos.x,cy:pos.y,r,class:'gps-precision'},layerGPS);
      create('circle',{cx:pos.x,cy:pos.y,r:8,class:'gps-ubicacion'},layerGPS);
      status.textContent=`GPS ubicado en el plano (estimación). Precisión reportada: ±${Math.round(lastPosition.coords.accuracy)} m.`;
    } else status.textContent='GPS recibido, pero la posición proyectada está fuera del plano. Verifica la calibración y tu ubicación.';
  }
}
function gpsSuccess(position){
  lastPosition=position;
  data.textContent=`Coordenadas: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)} · Precisión aproximada ±${Math.round(position.coords.accuracy)} m · ${new Date(position.timestamp).toLocaleTimeString('es-BO')}`;
  if(!transform) status.textContent='GPS recibido. Registra 3 referencias reales para mostrar el punto sobre el plano.';
  repaint();
}
function gpsFailure(err){
  const messages={1:'Permiso de ubicación rechazado. Actívalo en la configuración del navegador.',2:'El dispositivo no pudo determinar su ubicación.',3:'El GPS tardó demasiado. Prueba al aire libre.'};
  status.textContent=messages[err.code] || `Error de ubicación: ${err.message}`;
}
$('gps-iniciar').onclick=()=>{
  if(!navigator.geolocation){status.textContent='Este navegador no soporta geolocalización.';return;}
  if(!window.isSecureContext){status.textContent='GPS requiere HTTPS o localhost. En el celular abre una URL HTTPS; una IP local por HTTP no es suficiente.';return;}
  if(watchId!==null)return;
  status.textContent='Solicitando permiso y ubicación al dispositivo…';
  watchId=navigator.geolocation.watchPosition(gpsSuccess,gpsFailure,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  $('gps-iniciar').disabled=true;$('gps-parar').disabled=false;
};
$('gps-parar').onclick=()=>{
  if(watchId!==null)navigator.geolocation.clearWatch(watchId);
  watchId=null;$('gps-iniciar').disabled=false;$('gps-parar').disabled=true;
  status.textContent='Seguimiento GPS detenido. Última ubicación conservada en pantalla.';
};
$('gps-calibrar').onclick=()=>{
  picking=!picking;$('gps-calibrar').classList.toggle('activo',picking);
  $('gps-calibrar').textContent=picking?'Cancelar selección':'Elegir punto de referencia en el mapa';
  svg.classList.toggle('calibrando',picking);
  status.textContent=picking?'Haz clic en el plano sobre el lugar exacto donde estás físicamente.':'Selección de referencia cancelada.';
};
// Captura antes de los eventos originales de SVG, sin modificar el trazado de rutas.
// Click en el mapa solo al calibrar, evitando mover el viewport al pulsar.
svg.addEventListener('pointerdown',e=>{
  if(!picking)return;
  e.stopImmediatePropagation();
  const p=planePoint(e);
  if(!pointOK(p)){status.textContent='Selecciona un punto dentro del plano.';return;}
  pending={x:Math.round(p.x),y:Math.round(p.y)};
  picking=false;svg.classList.remove('calibrando');$('gps-calibrar').classList.remove('activo');
  $('gps-calibrar').textContent='Elegir punto de referencia en el mapa';
  selectedLabel.textContent=`Punto elegido: x=${pending.x}, y=${pending.y}`;
  $('gps-guardar').disabled=!lastPosition;
  $('gps-registrar-manual').disabled=false;
  status.textContent='Punto del mapa elegido. Estando físicamente allí, registra una lectura GPS o introduce coordenadas reales.';
  drawRefs();
},true);
function addRef(lat,lon){
  if(!pending){status.textContent='Primero elige un punto sobre el plano.';return;}
  if(!gpsOK({lat,lon})){status.textContent='Latitud o longitud inválida.';return;}
  if(refs.length>=3){status.textContent='Ya hay 3 referencias. Borra la calibración para registrar otras tres.';return;}
  refs.push({x:pending.x,y:pending.y,lat,lon});pending=null;
  $('gps-guardar').disabled=true;$('gps-registrar-manual').disabled=true;
  selectedLabel.textContent='Punto del plano: ninguno';save();repaint();
  status.textContent=`Referencia ${refs.length}/3 guardada. ${refs.length<3?'Ve a otro lugar del campus.':'Comprueba la calibración y el punto GPS.'}`;
}
$('gps-guardar').onclick=()=>{
  if(!lastPosition){status.textContent='Primero activa Mi ubicación y espera una lectura GPS.';return;}
  if(Date.now()-lastPosition.timestamp>30000){status.textContent='Lectura GPS antigua: espera una posición reciente.';return;}
  const acc=lastPosition.coords.accuracy;
  if(acc>35 && !confirm(`La precisión GPS es de ±${Math.round(acc)} m. La calibración puede quedar muy desviada. ¿Guardar de todos modos?`))return;
  addRef(lastPosition.coords.latitude,lastPosition.coords.longitude);
};
$('gps-registrar-manual').onclick=()=>{
  const latStr=$('gps-lat').value.trim(),lonStr=$('gps-lon').value.trim();
  if(!latStr||!lonStr){status.textContent='Escribe latitud y longitud reales.';return;}
  addRef(Number(latStr),Number(lonStr));
};
$('gps-borrar').onclick=()=>{
  if(!confirm('¿Borrar las referencias GPS guardadas en este navegador?'))return;
  refs=[];pending=null;save();repaint();status.textContent='Calibración eliminada.';
};
$('gps-exportar').onclick=()=>{
  if(!refs.length){status.textContent='No hay referencias que descargar.';return;}
  const blob=new Blob([JSON.stringify({tipo:'calibracion_gps_ucb',version:1,plano:{ancho:942,alto:569},referencias:refs},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='calibracion-ucb.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('gps-importar').onclick=()=>$('gps-archivo').click();
$('gps-archivo').onchange=async()=>{
  const file=$('gps-archivo').files[0];if(!file)return;
  try{
    const obj=JSON.parse(await file.text());
    if(obj.tipo!=='calibracion_gps_ucb'||obj.plano?.ancho!==942||obj.plano?.alto!==569||!Array.isArray(obj.referencias)||obj.referencias.length>3||!obj.referencias.every(refOK))throw Error('Archivo inválido');
    refs=obj.referencias;pending=null;save();repaint();status.textContent='Calibración importada.';
  }catch(err){status.textContent='No se pudo importar. Usa un archivo calibracion-ucb.json válido.';}
  $('gps-archivo').value='';
};
window.addEventListener('pagehide',()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);});
repaint();
})();
