<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/supabase.js"></script>
  <script src="js/utils.js"></script>
  <script src="js/guardia_backend.js"></script>

  <style>
    /* TUS ESTILOS EXACTOS */
    body { font-family: 'Roboto', sans-serif; background: #f4f6f8; padding: 20px; }
    .container { max-width: 1200px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h2, h3 { color: #b71c1c; margin-top: 0; }
    
    .grid-dashboard { display: flex; gap: 20px; margin-top: 20px; }
    .col-left { flex: 1; min-width: 300px; }
    .col-right { flex: 2; }
    
    .card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .card-header { font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    
    .form-group { margin-bottom: 15px; }
    label { display: block; font-size: 0.9em; color: #555; margin-bottom: 5px; }
    input[type="text"], input[type="number"], select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    
    .btn { background: #b71c1c; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
    .btn:hover { background: #d32f2f; }
    .btn-outline { background: transparent; border: 1px solid #b71c1c; color: #b71c1c; }
    .btn-sm { padding: 5px 10px; font-size: 0.8em; }
    .btn-del { background: #555; }
    
    table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
    th { background: #f9f9f9; }
    
    .days-checkbox { display: flex; gap: 10px; flex-wrap: wrap; }
    .chk-label { display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.85em; }
    
    /* Loader */
    .loader { display: none; text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>

<div class="container">
  <div style="display:flex; justify-content:space-between;">
    <h2>Administración de Guardia</h2>
    <button class="btn btn-outline" onclick="window.location.href='index.html'">Volver</button>
  </div>

  <div class="grid-dashboard">
    
    <div class="col-left">
      <div class="card">
        <div class="card-header">Configuración de Cupos</div>
        <div class="form-group">
          <label>Cupos Hombres</label>
          <input type="number" id="cuposHombres">
        </div>
        <div class="form-group">
          <label>Cupos Mujeres</label>
          <input type="number" id="cuposMujeres">
        </div>
        <button class="btn" onclick="guardarConfig()">Guardar Configuración</button>
      </div>

      <div class="card">
        <div class="card-header">Visualizar Calendario</div>
        <div class="form-group">
          <label>Mes</label>
          <select id="verMes">
            <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
            <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
            <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
            <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
          </select>
        </div>
        <div class="form-group">
          <label>Año</label>
          <input type="number" id="verAnio" value="2026">
        </div>
        <button class="btn" style="width:100%" onclick="abrirCalendario()">Ver Calendario</button>
      </div>
    </div>

    <div class="col-right">
      <div class="card">
        <div class="card-header">
          <span>Guardianes Permanentes</span>
          <button class="btn btn-sm" onclick="cargarPermanentes()"><i class="fas fa-sync"></i></button>
        </div>
        
        <div style="background:#fdfdfd; padding:15px; border:1px dashed #ccc; margin-bottom:15px;">
          <h4 style="margin-top:0; font-size:1em;">Asignar Nuevo Permanente</h4>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label>Buscar Voluntario (RUT o Nombre)</label>
              <input type="text" id="permBusqueda" placeholder="Escriba para buscar..." list="listaVols">
              <datalist id="listaVols"></datalist>
              <input type="hidden" id="permRut">
              <input type="hidden" id="permNombre">
              <input type="hidden" id="permGenero">
            </div>
            <div class="form-group">
              <label>Cama Default</label>
              <input type="text" id="permCama" placeholder="Ej: 1, 2, M1...">
            </div>
          </div>
          <div class="form-group">
            <label>Días de Guardia</label>
            <div class="days-checkbox">
              <label class="chk-label"><input type="checkbox" class="chk-day" value="1"> Lun</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="2"> Mar</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="3"> Mié</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="4"> Jue</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="5"> Vie</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="6"> Sáb</label>
              <label class="chk-label"><input type="checkbox" class="chk-day" value="0"> Dom</label>
            </div>
          </div>
          <button class="btn" onclick="agregarPermanente()">Asignar</button>
        </div>

        <div class="loader" id="loaderPerm">Cargando...</div>
        <table id="tablaPerm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Días</th>
              <th>Cama</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>

      </div>
    </div>

  </div>
</div>

<script>
  document.addEventListener("DOMContentLoaded", function() {
    // 1. Cargar Configuración
    cargarConfig();
    // 2. Cargar Permanentes
    cargarPermanentes();
    // 3. Cargar lista de voluntarios para el datalist
    cargarDatalistVoluntarios();
    
    // Configurar fechas
    const hoy = new Date();
    document.getElementById('verMes').value = hoy.getMonth() + 1;
    document.getElementById('verAnio').value = hoy.getFullYear();
    
    // Listener buscador
    document.getElementById('permBusqueda').addEventListener('input', function(e) {
       const val = e.target.value;
       const opts = document.getElementById('listaVols').childNodes;
       for (var i = 0; i < opts.length; i++) {
         if (opts[i].value === val) {
           document.getElementById('permRut').value = opts[i].getAttribute('data-rut');
           document.getElementById('permNombre').value = opts[i].value;
           document.getElementById('permGenero').value = opts[i].getAttribute('data-genero'); // Asumiendo que viene
           break;
         }
       }
    });
  });

  async function cargarConfig() {
    const config = await getConfiguracionCamas(); // Backend JS
    if(config) {
      document.getElementById('cuposHombres').value = config.hombres;
      document.getElementById('cuposMujeres').value = config.mujeres;
    }
  }

  async function guardarConfig() {
    const h = document.getElementById('cuposHombres').value;
    const m = document.getElementById('cuposMujeres').value;
    
    const res = await guardarConfiguracionCamas(h, m); // Backend JS
    if(res.ok) alert("Configuración guardada");
    else alert("Error al guardar");
  }

  async function cargarPermanentes() {
    document.getElementById('loaderPerm').style.display = 'block';
    const lista = await getGuardianesPermanentes(); // Backend JS
    
    const tbody = document.querySelector('#tablaPerm tbody');
    tbody.innerHTML = "";
    
    lista.forEach(p => {
      const tr = document.createElement('tr');
      // Convertir array [1,2] a texto "Lun, Mar"
      const mapDias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      // p.dias viene como array JSON desde Supabase
      const diasTexto = p.dias.map(d => mapDias[d]).join(", ");
      
      tr.innerHTML = `
        <td>${p.nombre}</td>
        <td>${diasTexto}</td>
        <td>${p.cama}</td>
        <td><button class="btn btn-sm btn-del" onclick="borrarPermanente('${p.rut}')">X</button></td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById('loaderPerm').style.display = 'none';
  }

  async function cargarDatalistVoluntarios() {
    const lista = await getVoluntariosActivos(); // Backend JS
    const dl = document.getElementById('listaVols');
    dl.innerHTML = "";
    lista.forEach(v => {
      const op = document.createElement('option');
      op.value = v.nombre;
      op.setAttribute('data-rut', v.rut);
      op.setAttribute('data-genero', 'Masculino'); // Default, idealmente traerlo de BD
      dl.appendChild(op);
    });
  }

  async function agregarPermanente() {
    const rut = document.getElementById('permRut').value;
    const nom = document.getElementById('permNombre').value;
    const gen = document.getElementById('permGenero').value || 'Masculino';
    const cama = document.getElementById('permCama').value;
    
    const chks = document.querySelectorAll('.chk-day:checked');
    let dias = [];
    chks.forEach(c => dias.push(parseInt(c.value)));

    if(!rut) { alert("Seleccione un voluntario válido"); return; }
    if(!cama || dias.length === 0) { alert("Falta cama o días"); return; }

    const res = await guardarGuardianPermanente(rut, nom, gen, dias, cama); // Backend JS
    
    alert(res.msg);
    if (res.ok) {
        // Limpiar form
        document.getElementById('permBusqueda').value = "";
        document.getElementById('permRut').value = "";
        document.getElementById('permCama').value = "";
        document.querySelectorAll('.chk-day').forEach(c => c.checked = false);
        cargarPermanentes();
    }
  }

  async function borrarPermanente(rut) {
      if(!confirm("¿Eliminar de lista permanente?")) return;
      await eliminarPermanente(rut); // Backend JS
      cargarPermanentes();
  }

  function abrirCalendario() {
    const anio = document.getElementById('verAnio').value;
    const mes = document.getElementById('verMes').value;
    
    // Abrir ventana popup directa al html
    const fullUrl = `calendario_guardia.html?anio=${anio}&mes=${mes}`;
    window.open(fullUrl, '_blank', 'width=1100,height=800,scrollbars=yes');
  }
</script>
</body>
</html>
