// V4: Ruta dibujada por el usuario, trazado aproximado; NO es una ruta calculada.
const ANCHO=942,ALTO=569,NS='http://www.w3.org/2000/svg';
const svg=document.getElementById('mapa');
const grupo=document.getElementById('marcadores');
const grupoRuta=document.getElementById('recorrido');
const estado=document.getElementById('estado');
const editarBtn=document.getElementById('editar');
const deshacerBtn=document.getElementById('deshacer');
const lugares=[
  {nombre:'Bloque A · Coliseo',x:465,y:127},
  {nombre:'Bloque B',x:589,y:86},
  {nombre:'Bloque C',x:708,y:85},
  {nombre:'Bloque D',x:371,y:300},
  {nombre:'Bloque F',x:738,y:161},
  {nombre:'Bloque G1',x:462,y:344},
  {nombre:'Bloque G2',x:563,y:276},
  {nombre:'Bloque I · Biblioteca',x:784,y:315},
  {nombre:'Bloque J',x:402,y:403},
  {nombre:'Bloque K',x:474,y:421},
  {nombre:'Bloque L',x:803,y:478},
  {nombre:'Ágora',x:516,y:207},
  {nombre:'Atrio',x:473,y:495},
  {nombre:'Ingreso principal',x:470,y:528}
];
const rutaInicial=[[478, 525], [517, 482], [551, 437], [553, 424], [580, 401], [603, 377], [615, 355], [588, 314], [635, 278], [659, 254], [653, 214], [622, 146], [577, 123], [562, 111]];
// Si había una ruta guardada en este navegador, recuperarla.
const CLAVE_RUTA='ucb_ruta_editada_v6';
function puntosValidos(datos) {
  return Array.isArray(datos) && datos.length >= 2 && datos.length <= 2000 &&
    datos.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
      p.x >= 0 && p.x <= ANCHO && p.y >= 0 && p.y <= ALTO);
}
function guardarLocal() {
  try { localStorage.setItem(CLAVE_RUTA, JSON.stringify(ruta)); }
  catch (error) { estado.textContent='No se pudo guardar automáticamente. Usa Descargar ruta.'; }
}
function recuperarLocal() {
  try {
    const raw=localStorage.getItem(CLAVE_RUTA);
    if (!raw) return null;
    const datos=JSON.parse(raw);
    return puntosValidos(datos)?datos:null;
  } catch (error) {return null;}
}
let ruta=recuperarLocal() || rutaInicial.map(([x,y])=>({x,y}));
let editando=false;
function rutaDibujar(){
  grupoRuta.replaceChildren();
  if(ruta.length>1){
    const linea=document.createElementNS(NS,'polyline');
    linea.setAttribute('points',ruta.map(p=>`${p.x},${p.y}`).join(' '));
    linea.setAttribute('class','ruta');
    grupoRuta.appendChild(linea);
  }
  ruta.forEach((p,i)=>{
    const nodo=document.createElementNS(NS,'circle');
    nodo.setAttribute('cx',p.x);nodo.setAttribute('cy',p.y);
    nodo.setAttribute('r',i===0||i===ruta.length-1?5:2.6);
    nodo.setAttribute('class','nodo-ruta');
    grupoRuta.appendChild(nodo);
  });
  deshacerBtn.disabled=!editando||ruta.length===0;
}
for(const lugar of lugares){
  const c=document.createElementNS(NS,'circle');
  c.setAttribute('cx',lugar.x);c.setAttribute('cy',lugar.y);
  c.setAttribute('r',8);c.setAttribute('class','punto');
  c.setAttribute('tabindex','0');c.setAttribute('role','button');
  c.setAttribute('aria-label',lugar.nombre);
  const title=document.createElementNS(NS,'title');title.textContent=lugar.nombre;c.appendChild(title);
  const elegir=()=>{estado.textContent=`Seleccionado: ${lugar.nombre}`};
  c.addEventListener('click',e=>{e.stopPropagation();elegir()});
  c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();elegir()}});
  grupo.appendChild(c);
}
let vb={x:0,y:0,w:ANCHO,h:ALTO};
function render(){svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)}
function puntoSVG(evento){const p=svg.createSVGPoint();p.x=evento.clientX;p.y=evento.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
function zoom(factor,evento){
  const centro=evento?puntoSVG(evento):{x:vb.x+vb.w/2,y:vb.y+vb.h/2};
  const nuevoW=Math.min(ANCHO*2,Math.max(ANCHO/8,vb.w*factor));
  const escala=nuevoW/vb.w;
  vb={x:centro.x-(centro.x-vb.x)*escala,y:centro.y-(centro.y-vb.y)*escala,w:nuevoW,h:vb.h*escala};render();
}
document.getElementById('zoom-in').onclick=()=>zoom(.75);
document.getElementById('zoom-out').onclick=()=>zoom(1.33);
document.getElementById('reiniciar').onclick=()=>{vb={x:0,y:0,w:ANCHO,h:ALTO};render();estado.textContent='Vista completa'};
svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.89,e)},{passive:false});
editarBtn.onclick=()=>{
  editando=!editando;
  editarBtn.classList.toggle('activo',editando);
  editarBtn.textContent=editando?'Terminar edición':'Editar recorrido';
  svg.classList.toggle('editando',editando);
  if(editando){
    if(ruta.length && !confirm('¿Empezar una ruta nueva? La ruta actual se borrará del dibujo. Descárgala antes si deseas conservarla.')) {
      editando=false;editarBtn.classList.remove('activo');editarBtn.textContent='Editar recorrido';svg.classList.remove('editando');return;
    }
    ruta=[];guardarLocal();estado.textContent='Modo edición: toca el ingreso y luego cada giro del camino';
  }
  else{guardarLocal();estado.textContent=`Recorrido guardado automáticamente: ${ruta.length} puntos`;}
  rutaDibujar();
};
deshacerBtn.onclick=()=>{if(!editando)return;ruta.pop();guardarLocal();rutaDibujar();estado.textContent=`Puntos: ${ruta.length}`};
document.getElementById('restaurar').onclick=()=>{ruta=rutaInicial.map(([x,y])=>({x,y}));editando=false;editarBtn.classList.remove('activo');editarBtn.textContent='Editar recorrido';svg.classList.remove('editando');guardarLocal();rutaDibujar();estado.textContent='Restaurada la línea roja aproximada de tu captura'};
let arrastre=null;
svg.addEventListener('pointerdown',e=>{
  if(e.target.classList.contains('punto')&&!editando)return;
  arrastre={id:e.pointerId,x:e.clientX,y:e.clientY,origen:{...vb},movio:false};
  svg.setPointerCapture(e.pointerId);svg.classList.add('arrastrando');
});
svg.addEventListener('pointermove',e=>{
  if(!arrastre||e.pointerId!==arrastre.id)return;
  const r=svg.getBoundingClientRect();
  const s=Math.min(r.width/arrastre.origen.w,r.height/arrastre.origen.h);
  if(Math.abs(e.clientX-arrastre.x)+Math.abs(e.clientY-arrastre.y)>4)arrastre.movio=true;
  vb.x=arrastre.origen.x-(e.clientX-arrastre.x)/s;
  vb.y=arrastre.origen.y-(e.clientY-arrastre.y)/s;render();
});
svg.addEventListener('pointerup',e=>{
  if(!arrastre||e.pointerId!==arrastre.id)return;
  const movio=arrastre.movio;arrastre=null;svg.classList.remove('arrastrando');
  if(movio)return;
  const p=puntoSVG(e);
  if(p.x<0||p.x>ANCHO||p.y<0||p.y>ALTO)return;
  if(editando){ruta.push({x:Math.round(p.x),y:Math.round(p.y)});guardarLocal();rutaDibujar();estado.textContent=`Punto ${ruta.length}: x=${Math.round(p.x)}, y=${Math.round(p.y)}`}
  else{estado.textContent=`Punto del plano: x=${Math.round(p.x)}, y=${Math.round(p.y)}`}
});
svg.addEventListener('pointercancel',()=>{arrastre=null;svg.classList.remove('arrastrando')});
rutaDibujar();render();

// Exportar los puntos reales de la ruta editada (sin convertirlos en GPS).
const descargarBtn=document.getElementById('descargar-ruta');
const importarBtn=document.getElementById('importar-ruta');
const archivoRuta=document.getElementById('archivo-ruta');
descargarBtn.addEventListener('click',()=>{
  if (ruta.length<2) { estado.textContent='Marca al menos dos puntos para descargar una ruta.';return; }
  const datos={tipo:'ruta_peatonal_ucb',version:1,plano:{ancho:ANCHO,alto:ALTO},puntos:ruta};
  const blob=new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='ruta-ucb.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  estado.textContent=`Descargada ruta-ucb.json con ${ruta.length} puntos`;
});
importarBtn.addEventListener('click',()=>archivoRuta.click());
archivoRuta.addEventListener('change',async()=>{
  const archivo=archivoRuta.files && archivoRuta.files[0];
  if (!archivo) return;
  try {
    const contenido=JSON.parse(await archivo.text());
    const puntos=Array.isArray(contenido)?contenido:(contenido.puntos || contenido.ruta);
    if (!puntosValidos(puntos)) throw new Error('Puntos inválidos o fuera del plano');
    ruta=puntos.map(p=>({x:p.x,y:p.y}));
    editando=false;editarBtn.classList.remove('activo');editarBtn.textContent='Editar recorrido';svg.classList.remove('editando');
    guardarLocal();rutaDibujar();
    estado.textContent=`Ruta importada: ${ruta.length} puntos. Guardada en este navegador.`;
  } catch(error) {estado.textContent='No se pudo importar. Selecciona un JSON válido de coordenadas X/Y.';}
  archivoRuta.value='';
});
if (recuperarLocal()) estado.textContent=`Ruta recuperada automáticamente (${ruta.length} puntos)`;

// V6: Dijkstra sobre los segmentos consecutivos de la ruta importada.
// El costo de cada segmento se mide en unidades del plano (píxeles), NO metros.
const capaCalculada=document.getElementById('ruta-calculada');
const origenSel=document.getElementById('origen');
const destinoSel=document.getElementById('destino');
const resumenCalculo=document.getElementById('resultado-calculo');
function actualizarSelectores(){
  const anteriorO=origenSel.value;
  const anteriorD=destinoSel.value;
  origenSel.replaceChildren();destinoSel.replaceChildren();
  for(let i=0;i<ruta.length;i++){
    const etiqueta=i===0?'Punto 1 · ingreso (trazado)':i===ruta.length-1?`Punto ${i+1} · extremo superior`:`Punto ${i+1}`;
    for(const sel of [origenSel,destinoSel]){
      const opt=document.createElement('option');opt.value=String(i);opt.textContent=etiqueta;sel.appendChild(opt);
    }
  }
  origenSel.value=anteriorO!==''&&Number(anteriorO)<ruta.length?anteriorO:'0';
  destinoSel.value=anteriorD!==''&&Number(anteriorD)<ruta.length?anteriorD:String(Math.max(0,ruta.length-1));
  if(origenSel.value===destinoSel.value && ruta.length>1)destinoSel.value=String(ruta.length-1);
}
function borrarCalculo(){capaCalculada.replaceChildren();resumenCalculo.textContent='Selecciona dos puntos y pulsa «Calcular ruta».';}
const dibujarOriginal=rutaDibujar;
rutaDibujar=function(){dibujarOriginal();actualizarSelectores();borrarCalculo();};
function peso(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function dijkstra(inicio,fin){
  const n=ruta.length;
  const dist=Array(n).fill(Infinity),anterior=Array(n).fill(-1),visitado=Array(n).fill(false);
  dist[inicio]=0;
  for(let paso=0;paso<n;paso++){
    let u=-1;
    for(let i=0;i<n;i++)if(!visitado[i]&&(u===-1||dist[i]<dist[u]))u=i;
    if(u===-1||dist[u]===Infinity||u===fin)break;
    visitado[u]=true;
    // Solo hay enlaces entre puntos consecutivos; no cruzamos edificios.
    for(const v of [u-1,u+1]){
      if(v<0||v>=n||visitado[v])continue;
      const alternativa=dist[u]+peso(ruta[u],ruta[v]);
      if(alternativa<dist[v]){dist[v]=alternativa;anterior[v]=u;}
    }
  }
  if(!Number.isFinite(dist[fin]))return null;
  const indices=[];
  for(let actual=fin;actual!==-1;actual=anterior[actual])indices.push(actual);
  return {indices:indices.reverse(),distancia:dist[fin]};
}
document.getElementById('calcular').addEventListener('click',()=>{
  if(editando){resumenCalculo.textContent='Termina la edición antes de calcular.';return;}
  const a=Number(origenSel.value),b=Number(destinoSel.value);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=ruta.length||b>=ruta.length){resumenCalculo.textContent='Selecciona puntos válidos.';return;}
  if(a===b){borrarCalculo();resumenCalculo.textContent='Origen y destino son el mismo punto.';return;}
  const resultado=dijkstra(a,b);
  if(!resultado){resumenCalculo.textContent='No hay conexión entre esos puntos.';return;}
  capaCalculada.replaceChildren();
  const linea=document.createElementNS(NS,'polyline');
  linea.setAttribute('points',resultado.indices.map(i=>`${ruta[i].x},${ruta[i].y}`).join(' '));
  linea.setAttribute('class','ruta-calculada');capaCalculada.appendChild(linea);
  for(const [indice,clase] of [[a,'inicio-calculado'],[b,'fin-calculado']]){
    const circulo=document.createElementNS(NS,'circle');
    circulo.setAttribute('cx',ruta[indice].x);circulo.setAttribute('cy',ruta[indice].y);
    circulo.setAttribute('r',6);circulo.setAttribute('class',clase);capaCalculada.appendChild(circulo);
  }
  resumenCalculo.textContent=`Ruta calculada: ${resultado.indices.length} puntos, ${resultado.distancia.toFixed(1)} unidades del plano. Todavía no son metros.`;
  estado.textContent=`Dijkstra: punto ${a+1} → punto ${b+1}`;
});
actualizarSelectores();borrarCalculo();
