/**
 * tesoreria_backend.js
 * Lógica financiera COMPLETA Y CORREGIDA
 * Respeta la Regla de Oro: Insignes exentos, Estudiantes diferenciados, Descuento por cumplimiento de Guardia.
 */

// --- 1. DASHBOARD ---
async function getDatosDashboard() {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; 
    const anioActual = hoy.getFullYear();
    const inicioMes = `${anioActual}-${String(mesActual).padStart(2,'0')}-01`;
    const finMes = `${anioActual}-${String(mesActual).padStart(2,'0')}-31`;

    // Recaudación Mes Actual
    const { data: pagos } = await clienteSupabase
        .from('pagos')
        .select('monto')
        .gte('fecha_registro', inicioMes)
        .lte('fecha_registro', finMes);
    const recaudado = pagos ? pagos.reduce((sum, p) => sum + Number(p.monto), 0) : 0;

    // Meta
    const { data: paramMeta } = await clienteSupabase.from('parametros').select('valor').eq('clave', 'META_RECAUDACION').single();
    const meta = paramMeta ? Number(paramMeta.valor) : 500000;

    // Morosos (Cuotas ordinarias vencidas de meses anteriores)
    const { count } = await clienteSupabase
        .from('cuotas_ordinarias')
        .select('*', { count: 'exact', head: true })
        .eq('pagado', 'NO')
        .lt('mes', mesActual)
        .eq('anio', anioActual); 

    return { recaudado, meta, morosos: count || 0 };
}

// --- 2. GENERACIÓN MASIVA DE CUOTAS (LÓGICA CENTRAL) ---
async function generarCuotasMasivas(anio, mes) {
    console.log(`Generando cuotas ${mes}/${anio}...`);
    
    // a) Cargar Parámetros de Negocio
    const params = await obtenerParametrosDict();
    const valorNormal = Number(params['CUOTA_NORMAL'] || 12000);
    const valorEstudiante = Number(params['CUOTA_ESTUDIANTE'] || 6000);
    const umbralNoches = Number(params['UMBRAL_NOCHES_DESCUENTO'] || 5); // La meta de noches
    const valorDescuento = Number(params['VALOR_DESCUENTO_GUARDIA'] || 12000); // El premio

    // b) Obtener Voluntarios Activos
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('estado', 'ACTIVO');

    if (!voluntarios) return { ok: false, msg: "No hay voluntarios activos." };

    let generadas = 0;

    // c) Procesar uno a uno
    for (const vol of voluntarios) {
        
        // 1. INSIGNES: Nunca pagan (Regla de Oro)
        if (vol.tipo && vol.tipo.toUpperCase() === 'INSIGNE') continue;

        // 2. EVITAR DUPLICADOS: Si ya existe la cuota este mes, saltar
        const { data: existe } = await clienteSupabase
            .from('cuotas_ordinarias')
            .select('id')
            .eq('rut', vol.rut)
            .eq('anio', anio)
            .eq('mes', mes)
            .maybeSingle();

        if (existe) continue;

        // 3. DETERMINAR MONTO BASE (Normal vs Estudiante)
        let monto = valorNormal;
        if (vol.subtipo && vol.subtipo.toUpperCase() === 'ESTUDIANTE') {
            monto = valorEstudiante;
        }

        // 4. APLICAR DESCUENTO POR GUARDIA (Lógica Corregida)
        // Se evalúa la asistencia del mes ANTERIOR al cobro
        let mesEvaluar = mes - 1;
        let anioEvaluar = anio;
        if (mesEvaluar === 0) { mesEvaluar = 12; anioEvaluar = anio - 1; }

        const nochesPernoctadas = await contarNochesGuardia(vol.rut, anioEvaluar, mesEvaluar);
        
        // CONDICIÓN: Si alcanzó el umbral, se aplica el descuento
        if (nochesPernoctadas >= umbralNoches) {
            monto = monto - valorDescuento;
            if (monto < 0) monto = 0; // Nunca negativo
        }

        // 5. INSERTAR CUOTA (Incluso si es $0, para que quede registro de cumplimiento)
        // Si es $0, podríamos marcarla como pagada automáticamente, o dejarla pendiente de $0.
        // Asumiremos pendiente de $0 para que el tesorero valide.
        const { error } = await clienteSupabase.from('cuotas_ordinarias').insert({
            rut: vol.rut,
            anio: anio,
            mes: mes,
            monto: monto,
            pagado: monto === 0 ? 'SI' : 'NO' // Si es 0, ya está "pagada"
        });

        if (!error) generadas++;
    }

    return { ok: true, count: generadas, msg: `Proceso terminado. ${generadas} cuotas generadas.` };
}

// --- 3. GENERACIÓN INDIVIDUAL ---
async function generarCuotaIndividual(rut, anio, mes, montoManual) {
    const { data: existe } = await clienteSupabase.from('cuotas_ordinarias').select('id').eq('rut', rut).eq('anio', anio).eq('mes', mes).maybeSingle();
    if (existe) return { ok: false, msg: "Cuota ya existe." };

    const { error } = await clienteSupabase.from('cuotas_ordinarias').insert({
        rut, anio, mes, monto: montoManual, pagado: 'NO'
    });
    return error ? { ok: false, msg: error.message } : { ok: true, msg: "Cuota creada." };
}

// --- 4. LISTA DE COBRO ---
async function getListaCobro() {
    // Mapa de nombres
    const { data: vols } = await clienteSupabase.from('voluntarios').select('rut, nombre, email');
    const mapa = {};
    if(vols) vols.forEach(v => mapa[normalizarRut(v.rut)] = v);

    let lista = [];
    const meses = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // Ordinarias Pendientes
    const { data: ord } = await clienteSupabase.from('cuotas_ordinarias').select('*').eq('pagado', 'NO');
    if (ord) {
        ord.forEach(d => {
            const v = mapa[normalizarRut(d.rut)] || { nombre: d.rut };
            lista.push({
                id: d.id, origen: 'ordinaria', tipo: 'ORDINARIA',
                rut: d.rut, nombre: v.nombre,
                detalle: `Cuota ${meses[d.mes] || d.mes}/${d.anio}`, 
                monto: d.monto
            });
        });
    }

    // Extras Pendientes
    const { data: ext } = await clienteSupabase.from('cuotas_extras').select('*').eq('pagado', 'NO');
    if (ext) {
        ext.forEach(d => {
            const v = mapa[normalizarRut(d.rut)] || { nombre: d.rut };
            lista.push({
                id: d.id, origen: 'extra', tipo: 'EXTRA',
                rut: d.rut, nombre: v.nombre,
                detalle: d.motivo, monto: d.monto
            });
        });
    }
    return lista;
}

// --- 5. REGISTRAR PAGO ---
async function registrarPago(id, origen, tipo, monto, metodo, rut, detalle) {
    // 1. Guardar en Historial
    const { error: e1 } = await clienteSupabase.from('pagos').insert({
        rut, tipo, detalle, monto, metodo, fecha_registro: new Date()
    });
    if(e1) return { ok: false, msg: e1.message };

    // 2. Marcar Deuda como Pagada
    const tabla = origen === 'ordinaria' ? 'cuotas_ordinarias' : 'cuotas_extras';
    const { error: e2 } = await clienteSupabase.from(tabla).update({ pagado: 'SI' }).eq('id', id);
    
    return e2 ? { ok: false, msg: "Error al cerrar deuda" } : { ok: true };
}

// --- 6. HISTORIAL DE PAGOS ---
async function getHistorialPagos() {
    const { data } = await clienteSupabase
        .from('pagos')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .limit(300);
    
    return (data || []).map(p => ({
        fecha: new Date(p.fecha_registro).toLocaleDateString(),
        rut: p.rut, tipo: p.tipo, detalle: p.detalle, monto: p.monto, metodo: p.metodo
    }));
}

// --- 7. COBRO EXTRA MASIVO ---
async function generarCobroExtraMasivo(motivo, monto) {
    const { data: activos } = await clienteSupabase.from('voluntarios').select('rut').eq('estado', 'ACTIVO');
    if(!activos) return { ok: false, msg: "Sin voluntarios." };

    const filas = activos.map(v => ({
        rut: v.rut, motivo, monto, pagado: 'NO', fecha_generacion: new Date()
    }));
    
    const { error } = await clienteSupabase.from('cuotas_extras').insert(filas);
    return error ? { ok: false, msg: error.message } : { ok: true, count: filas.length };
}

// --- HELPERS Y CÁLCULOS ---

async function obtenerParametrosDict() {
    const { data } = await clienteSupabase.from('parametros').select('*');
    const dict = {};
    if (data) data.forEach(p => dict[p.clave] = p.valor);
    return dict;
}

// Esta función conecta con el módulo de Guardia para ver si cumplió la meta
async function contarNochesGuardia(rut, anio, mes) {
    // Calculamos las fechas inicio y fin del mes a evaluar
    const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`;
    const fin = `${anio}-${String(mes).padStart(2,'0')}-31`;
    
    // Contamos registros en la tabla de asistencia de guardia
    // Se asume que existe la tabla 'asistencia_guardias' con columna 'rut' y 'fecha'
    // que se llena desde el módulo de Guardia/Bitácora
    const { count, error } = await clienteSupabase
        .from('asistencia_guardias') // Asegúrate de tener esta tabla
        .select('*', { count: 'exact', head: true })
        .eq('rut', normalizarRut(rut))
        .gte('fecha', inicio)
        .lte('fecha', fin);

    if (error) {
        console.warn("Error contando noches guardia:", error);
        return 0;
    }
    return count || 0;
}
