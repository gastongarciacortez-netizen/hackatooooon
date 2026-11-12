// V9: navegación entre edificios basada en los 42 nodos reales dibujados.
// Longitudes en unidades del plano. Accesos y caminos sujetos a verificación física.
(() => {
  'use strict';
  const svg = document.getElementById('mapa');
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const CLAVE = 'ucb_red_peatonal_v9';
  const RED_VERIFICADA_POR_USUARIO = {"nodos":[{"x":478,"y":525},{"x":517,"y":482},{"x":551,"y":437},{"x":553,"y":424},{"x":580,"y":401},{"x":603,"y":377},{"x":615,"y":355},{"x":588,"y":314},{"x":635,"y":278},{"x":659,"y":254},{"x":653,"y":214},{"x":622,"y":146},{"x":577,"y":123},{"x":562,"y":111},{"x":573,"y":433},{"x":592,"y":413},{"x":628,"y":378},{"x":650,"y":353},{"x":700,"y":340},{"x":745,"y":325},{"x":472,"y":435},{"x":386,"y":425},{"x":471,"y":381},{"x":397,"y":387},{"x":376,"y":365},{"x":373,"y":336},{"x":472,"y":364},{"x":572,"y":98},{"x":627,"y":106},{"x":667,"y":198},{"x":578,"y":323},{"x":565,"y":305},{"x":427,"y":412},{"x":528,"y":491},{"x":637,"y":490},{"x":647,"y":502},{"x":692,"y":504},{"x":705,"y":492},{"x":748,"y":494},{"x":760,"y":484},{"x":773,"y":484},{"x":610,"y":176}],"enlaces":[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[2,14],[14,15],[15,16],[16,17],[17,18],[18,19],[0,20],[20,21],[20,22],[22,23],[23,24],[24,25],[22,26],[13,27],[11,28],[10,29],[7,30],[30,31],[20,32],[1,33],[33,34],[34,35],[35,36],[36,37],[37,38],[38,39],[39,40],[10,41]],"accesos":{"0":13,"1":27,"2":28,"3":25,"4":29,"5":26,"6":31,"7":19,"8":32,"9":20,"10":40,"11":41,"12":20,"13":0}};
  const MAX_NODOS = 2500;
  const lugaresV8 = lugares.map((l,i)=>({...l,id:String(i)}));
  const lugarPorId = id => lugaresV8.find(l=>l.id===id);
  const dist = (p,q) => Math.hypot(p.x-q.x,p.y-q.y);
  const valido = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=942 && p.y>=0 && p.y<=569;
  function inicializar(){
    const nodos=ruta.map(p=>({x:p.x,y:p.y}));
    const enlaces=Array.from({length:Math.max(0,nodos.length-1)},(_,i)=>[i,i+1]);
    const accesos={};
    const ingreso=lugaresV8.find(l=>l.nombre==='Ingreso principal');
    if(ingreso && nodos.length && dist(ingreso,nodos[0])<=22)accesos[ingreso.id]=0;
    return {nodos,enlaces,accesos};
  }
  function estructuraValida(x){
    if(!x||!Array.isArray(x.nodos)||!Array.isArray(x.enlaces)||!x.accesos || x.nodos.length>MAX_NODOS || !x.nodos.every(valido))return false;
    const n=x.nodos.length;
    if(x.enlaces.length>6000||!x.enlaces.every(e=>Array.isArray(e)&&e.length===2&&e.every(i=>Number.isInteger(i)&&i>=0&&i<n)&&e[0]!==e[1]))return false;
    return Object.entries(x.accesos).every(([k,i])=>Boolean(lugarPorId(k))&&Number.isInteger(i)&&i>=0&&i<n);
  }
  let red;
  try {const anterior=JSON.parse(localStorage.getItem(CLAVE));red=estructuraValida(anterior)?anterior:structuredClone(RED_VERIFICADA_POR_USUARIO);}
  catch {red=structuredClone(RED_VERIFICADA_POR_USUARIO);}
  let modo='normal',sec=[], historial=[];
  const grpTramos=$('red-tramos'),grpNodos=$('red-nodos'),grpRuta=$('red-calculada');
  const estado=$('red-estado'),resultado=$('red-resultado');
  const btnD=$('red-dibujar'),btnT=$('red-terminar'),btnV=$('red-vincular');
  function guardar(){try{localStorage.setItem(CLAVE,JSON.stringify(red));}catch{estado.textContent='No se pudo guardar automáticamente. Usa «Descargar red».';}}
  function nuevaLinea(puntos,clase,grupo){const l=document.createElementNS(NS,'polyline');l.setAttribute('points',puntos.map(p=>`${p.x},${p.y}`).join(' '));l.setAttribute('class',clase);grupo.appendChild(l);}
  function circulo(p,r,clase,grupo){const e=document.createElementNS(NS,'circle');e.setAttribute('cx',p.x);e.setAttribute('cy',p.y);e.setAttribute('r',r);e.setAttribute('class',clase);grupo.appendChild(e);}
  function pintar(){
    grpTramos.replaceChildren();grpNodos.replaceChildren();
    for(const [a,b] of red.enlaces)nuevaLinea([red.nodos[a],red.nodos[b]],'red-segmento',grpTramos);
    const vinculados=new Set(Object.values(red.accesos));
    red.nodos.forEach((n,i)=>circulo(n,vinculados.has(i)?5:2.8,vinculados.has(i)?'red-nodo-vinculado':'red-nodo',grpNodos));
    if(modo==='dibujo'&&sec.length)circulo(red.nodos[sec[sec.length-1]],6,'red-nodo-inicio',grpNodos);
  }
  let opcionesInicializadas=false;
  function opciones(){
    for(const id of ['red-edificio','red-origen','red-destino']){
      const sel=$(id),v=sel.value;sel.replaceChildren();
      for(const l of lugaresV8){
        const op=document.createElement('option');op.value=l.id;
        op.textContent=l.nombre+(id!=='red-edificio'&&!Object.prototype.hasOwnProperty.call(red.accesos,l.id)?' (sin acceso conectado)':'');
        sel.appendChild(op);
      }
      if(lugarPorId(v))sel.value=v;
    }
    if(!opcionesInicializadas){$('red-origen').value='13';$('red-destino').value='7';opcionesInicializadas=true;}
    // Mantener destino elegido cuando sea posible.
    const posibles=Object.keys(red.accesos).filter(id=>id!==$('red-origen').value);
    if(posibles.length && !Object.hasOwn(red.accesos,$('red-destino').value))$('red-destino').value=posibles[0];
  }
  // Preserva selecciones de usuario mientras se guardan nuevos accesos.
  function actualizarOpciones(){const o=$('red-origen').value,d=$('red-destino').value;opciones();if(lugarPorId(o))$('red-origen').value=o;if(lugarPorId(d))$('red-destino').value=d;}
  function cancelarModo(){modo='normal';sec=[];historial=[];btnD.classList.remove('activo');btnV.classList.remove('activo');svg.classList.remove('red-editando','red-vinculando');btnT.disabled=true;$('red-deshacer').disabled=true;btnD.textContent='➕ Dibujar camino nuevo';btnV.textContent='📌 Vincular acceso del edificio';pintar();}
  function puntoEvento(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  function masCercano(p,umbral=12){let index=-1,d=Infinity;red.nodos.forEach((n,i)=>{const di=dist(n,p);if(di<d){d=di;index=i;}});return d<=umbral?index:-1;}
  function agregarEnlace(a,b){if(a===b)return false;const ya=red.enlaces.some(([u,v])=>(u===a&&v===b)||(u===b&&v===a));if(!ya){red.enlaces.push([a,b]);return true;}return false;}
  // El modo edición captura la pulsación antes que el editor antiguo, evitando interferencias.
  let pulsacion=null;
  svg.addEventListener('pointerdown',e=>{
    if(modo==='normal')return;
    e.preventDefault();e.stopImmediatePropagation();
    pulsacion={x:e.clientX,y:e.clientY};
  },true);
  svg.addEventListener('pointermove',e=>{if(modo!=='normal')e.stopImmediatePropagation();},true);
  svg.addEventListener('pointerup',e=>{
    if(modo==='normal')return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!pulsacion)return;
    const fueMovimiento=Math.hypot(e.clientX-pulsacion.x,e.clientY-pulsacion.y)>9;pulsacion=null;
    if(fueMovimiento)return;
    const p=puntoEvento(e);if(!valido(p)){estado.textContent='Toca dentro de la imagen.';return;}
    if(modo==='vinculo'){
      const i=masCercano(p,17);
      if(i<0){estado.textContent='Toca un nodo morado del acceso. Si no existe, primero dibuja un camino que llegue hasta allí.';return;}
      const id=$('red-edificio').value, l=lugarPorId(id);
      if(!l)return;
      // Evitar asignar accidentalmente un acceso a un punto remoto.
      if(dist(red.nodos[i],l)>85 && !confirm('El nodo marcado está lejos del centro de ese edificio. ¿Confirmas que es su acceso peatonal real?'))return;
      red.accesos[id]=i;guardar();cancelarModo();actualizarOpciones();
      estado.textContent=`Acceso vinculado: ${l.nombre}. Ahora puedes calcular su ruta si está conectado al resto de la red.`;
      return;
    }
    let i=masCercano(p);
    if(i<0){if(red.nodos.length>=MAX_NODOS){estado.textContent='Se alcanzó el máximo de nodos.';return;}i=red.nodos.push({x:Math.round(p.x),y:Math.round(p.y)})-1;}
    const nuevoEnlace=sec.length?agregarEnlace(sec[sec.length-1],i):false;
    historial.push({nodo:i, nuevoEnlace});
    sec.push(i);guardar();pintar();$('red-deshacer').disabled=false;
    estado.textContent=`Camino en edición: ${sec.length} puntos. Toca otro tramo o pulsa «Terminar camino».`;
  },true);
  svg.addEventListener('pointercancel',()=>{pulsacion=null;},true);
  btnD.onclick=()=>{
    if(modo==='dibujo'){cancelarModo();return;}
    if(document.getElementById('editar').classList.contains('activo')){estado.textContent='Termina «Editar recorrido» antes de dibujar caminos de la red.';return;}
    if(svg.classList.contains('calibrando')){estado.textContent='Cancela la selección de referencia GPS antes de dibujar.';return;}
    cancelarModo();modo='dibujo';svg.classList.add('red-editando');btnD.classList.add('activo');btnD.textContent='Cancelar dibujo';btnT.disabled=false;
    estado.textContent='Toca un nodo morado existente para comenzar; sigue el camino real hasta el nuevo lugar.';
  };
  btnT.onclick=()=>{cancelarModo();guardar();estado.textContent='Camino añadido a la red y guardado. Ahora vincula un edificio con el nodo de su acceso.';};
  $('red-deshacer').onclick=()=>{
    if(modo!=='dibujo'||!sec.length)return;
    const ultimo=sec.pop();const ultimaAccion=historial.pop();
    if(sec.length && ultimaAccion.nuevoEnlace){const anterior=sec[sec.length-1];const ix=red.enlaces.findIndex(([a,b])=>(a===anterior&&b===ultimo)||(b===anterior&&a===ultimo));if(ix>=0)red.enlaces.splice(ix,1);}
    // Solo borrar nodos que quedaron aislados al final del vector (sin cambiar índices de otros).
    if(ultimo===red.nodos.length-1&&!red.enlaces.some(e=>e.includes(ultimo))&&!Object.values(red.accesos).includes(ultimo))red.nodos.pop();
    guardar();pintar();$('red-deshacer').disabled=!sec.length;
    estado.textContent=`Edición: quedan ${sec.length} puntos en este camino.`;
  };
  btnV.onclick=()=>{
    if(modo==='vinculo'){cancelarModo();return;}
    if(document.getElementById('editar').classList.contains('activo')||svg.classList.contains('calibrando')){estado.textContent='Termina la edición anterior o la calibración GPS antes de vincular un edificio.';return;}
    cancelarModo();modo='vinculo';btnV.classList.add('activo');btnV.textContent='Cancelar vínculo';svg.classList.add('red-vinculando');
    estado.textContent=`Seleccionaste «${lugarPorId($('red-edificio').value)?.nombre}». Toca el nodo morado que corresponda a su entrada peatonal REAL.`;
  };
  $('red-reiniciar').onclick=()=>{
    if(!confirm('Esto reemplazará toda la red V8 por la ruta roja de V7. Descarga la red si deseas conservar las conexiones.'))return;
    red=inicializar();cancelarModo();guardar();actualizarOpciones();grpRuta.replaceChildren();resultado.textContent='Red reiniciada.';estado.textContent='Red reconstruida desde la ruta roja actual.';
  };
  function algoritmo(a,b){
    const n=red.nodos.length,g=Array.from({length:n},()=>[]);
    for(const [u,v] of red.enlaces){const w=dist(red.nodos[u],red.nodos[v]);g[u].push([v,w]);g[v].push([u,w]);}
    const d=Array(n).fill(Infinity),prev=Array(n).fill(-1),hecho=Array(n).fill(false);d[a]=0;
    for(let t=0;t<n;t++){
      let u=-1;for(let i=0;i<n;i++)if(!hecho[i]&&(u===-1||d[i]<d[u]))u=i;
      if(u===-1||d[u]===Infinity||u===b)break;hecho[u]=true;
      for(const [v,w] of g[u])if(d[u]+w<d[v]){d[v]=d[u]+w;prev[v]=u;}
    }
    if(!Number.isFinite(d[b]))return null;
    const camino=[];for(let u=b;u!==-1;u=prev[u])camino.push(u);
    return {camino:camino.reverse(),distancia:d[b]};
  }
  $('red-calcular').onclick=()=>{
    grpRuta.replaceChildren();
    const io=$('red-origen').value,id=$('red-destino').value;
    const a=red.accesos[io],b=red.accesos[id];
    if(a===undefined||b===undefined){resultado.textContent='Falta vincular al menos uno de los dos edificios a su acceso peatonal en la red.';return;}
    if(a===b){resultado.textContent='Origen y destino están vinculados al mismo nodo. Comprueba los accesos.';return;}
    const r=algoritmo(a,b);
    if(!r){resultado.textContent='No hay camino conectado entre esos edificios. Dibuja y conecta los tramos faltantes.';return;}
    nuevaLinea(r.camino.map(i=>red.nodos[i]),'red-ruta',grpRuta);
    circulo(red.nodos[a],6,'inicio-calculado',grpRuta);circulo(red.nodos[b],6,'fin-calculado',grpRuta);
    const escala=Number(localStorage.getItem('ucb_escala_m_por_unidad_v10'));
    if(Number.isFinite(escala)&&escala>0){
      const metros=r.distancia*escala, segundos=metros/1.2;
      resultado.textContent=`Ruta: ${lugarPorId(io).nombre} → ${lugarPorId(id).nombre} · ${metros.toFixed(1)} m estimados · ${Math.max(1,Math.round(segundos/60))} min aprox. (a 1,2 m/s) · ${r.distancia.toFixed(1)} unidades del plano.`;
    }else{
      resultado.textContent=`Ruta: ${lugarPorId(io).nombre} → ${lugarPorId(id).nombre} · ${r.camino.length} nodos · ${r.distancia.toFixed(1)} unidades del plano. Aún no hay escala en metros.`;
    }
    $('v9-advertencia').textContent=(io==='0'||id==='0'||io==='12'||id==='12')?'⚠️ Acceso de Coliseo/Atrio pendiente de confirmar en el campus.':'⚠️ Recorrido esquemático: valida caminos y entradas antes de usarlo como guía real.';
  };
  $('red-descargar').onclick=()=>{
    const obj={tipo:'red_peatonal_ucb',version:1,plano:{ancho:942,alto:569},...red};
    const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='red-peatonal-ucb.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('red-importar').onclick=()=>$('red-archivo').click();
  $('v9-invertir').onclick=()=>{const a=$('red-origen').value;$('red-origen').value=$('red-destino').value;$('red-destino').value=a;$('red-calcular').click();};
  $('v9-ingreso-biblioteca').onclick=()=>{$('red-origen').value='13';$('red-destino').value='7';$('red-calcular').click();};
  $('v9-ingreso-coliseo').onclick=()=>{$('red-origen').value='13';$('red-destino').value='0';$('red-calcular').click();};
  $('red-archivo').onchange=async()=>{
    try{const raw=JSON.parse(await $('red-archivo').files[0].text());if(raw.plano?.ancho!==942||raw.plano?.alto!==569||!estructuraValida(raw))throw Error('Red no válida');red={nodos:raw.nodos,enlaces:raw.enlaces,accesos:raw.accesos};cancelarModo();guardar();actualizarOpciones();grpRuta.replaceChildren();resultado.textContent='Red importada.';estado.textContent='Red peatonal importada y guardada en este navegador.';}
    catch{estado.textContent='Error al importar. Selecciona un archivo red-peatonal-ucb.json válido.';}
    $('red-archivo').value='';
  };
  window.UCBRed = { distanciaIngresoBiblioteca: () => {
    const a=red.accesos['13'],b=red.accesos['7'];
    if(a===undefined||b===undefined)return null;
    return algoritmo(a,b)?.distancia ?? null;
  }, recalcular: () => $('red-calcular').click() };
  opciones();pintar();
  $('red-calcular').click();
  estado.textContent=`Red lista: ${red.nodos.length} nodos, ${red.enlaces.length} conexiones, ${Object.keys(red.accesos).length} accesos vinculados.`;
})();
