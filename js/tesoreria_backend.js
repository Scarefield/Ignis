/**
 * BACKEND TESORERÍA (Traducción 1:1 de Tesoreria.gs)
 * Respeta la lógica de cálculo de morosidad y generación masiva.
 */

// --- DASHBOARD ---
// Réplica exacta de function getDatosDashboard()
async function getDatosDashboard() {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; 
    const anioActual = hoy.getFullYear();

    // 1. Recaudado (Suma pagos del mes actual)
    const fechaInicio = new Date(anioActual, mesActual - 1, 1).toISOString();
    const fechaFin = new Date(anioActual, mesActual, 1).toISOString();
    
    const { data: pagos } = await clienteSupabase
        .from('pagos')
        .select('monto_pagado')
        .gte('fecha_registro', fechaInicio)
        .lt('fecha_registro', fechaFin);

    let recaudado = 0;
    if (pagos) recaudado = pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0);

    // 2. Meta (Desde configuración/parámetros)
    const { data: conf } = await clienteSupabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'META_RECAUDACION')
        .single();
    const meta = conf ? Number(conf.valor) : 500000;

    // 3. Morosos (Lógica exacta de GAS: diferencia > 3 meses)
    // Traemos todas las cuotas ordinarias NO pagadas para calcular la fecha en JS
    const { data: pendientes } = await clienteSupabase
        .from('cuotas_ordinarias')
        .select('anio, mes')
        .eq('pagado', 'NO');

    let morosos = 0;
    if (pendientes) {
        pendientes.forEach(d => {
            // Lógica original: const fC = new Date(d[1], d[2]-1, 1);
            const fC = new Date(d.anio, d.mes - 1, 1);
            const diff = (hoy - fC) / (1000 * 60 * 60 * 24 * 30); // Diferencia en meses aprox
            if (diff > 3) morosos++;
        });
    }

    return { recaudado, meta, morosos };
}

// --- LISTA DE COBRO ---
// Réplica exacta de function getListaCobro()
async function getListaCobro() {
    let lista = [];

    // 1. Mapa de Nombres (Voluntarios)
    const { data: voluntarios } = await clienteSupabase.from('voluntarios').select('rut, nombre');
    let mapaNombres = {};
    if (voluntarios) {
        voluntarios.forEach(v => {
            mapaNombres[normalizarRutJS(v.rut)] = v.nombre;
        });
    }

    // 2. Cuotas Ordinarias Pendientes
    const { data: ords } = await clienteSupabase
        .from('cuotas_ordinarias')
        .select('*')
        .eq('pagado', 'NO');
    
    if (ords) {
        ords.forEach(d => {
            const rutLimpio = normalizarRutJS(d.rut);
            lista.push({
                id: d.id, // Usamos ID real de Supabase
                rut: d.rut,
                nombre: mapaNombres[rutLimpio] || d.rut,
                tipo: 'ORDINARIA',
                detalle: `Cuota ${obtenerNombreMes(d.mes)} ${d.anio}`,
                monto: d.monto_base
            });
        });
    }

    // 3. Cuotas Extras Pendientes
    const { data: extras } = await clienteSupabase
        .from('cuotas_extras')
        .select('*')
        .eq('pagado', 'NO');

    if (extras) {
        extras.forEach(e => {
            const rutLimpio = normalizarRutJS(e.rut);
            lista.push({
                id: e.id,
                rut: e.rut,
                nombre: mapaNombres[rutLimpio] || e.rut,
                tipo: 'EXTRA',
                detalle: e.motivo,
                monto: e.monto
            });
        });
    }

    return lista;
}

// --- REGISTRAR PAGO ---
// Réplica exacta de function registrarPago(datos)
async function registrarPago(datos) {
    // datos = { id, tipo, monto, metodo }
    
    // 1. Marcar como pagado en la tabla correspondiente
    const tabla = datos.tipo === 'ORDINARIA' ? 'cuotas_ordinarias' : 'cuotas_extras';
    
    // Primero obtenemos el detalle para el historial (necesito saber RUT y Mes/Motivo)
    const { data: deuda } = await clienteSupabase
        .from(tabla)
        .select('*')
        .eq('id', datos.id)
        .single();
    
    if (!deuda) return { ok: false, msg: "Deuda no encontrada" };

    // Actualizamos a 'SI'
    const { error: errUpd } = await clienteSupabase
        .from(tabla)
        .update({ pagado: 'SI' })
        .eq('id', datos.id);

    if (errUpd) return { ok: false, msg: errUpd.message };

    // 2. Insertar en Historial (Pagos)
    const detalle = datos.tipo === 'ORDINARIA' ? `Cuota Mes ${deuda.mes}/${deuda.anio}` : deuda.motivo;
    
    const { error: errIns } = await clienteSupabase
        .from('pagos')
        .insert({
            rut: deuda.rut,
            tipo: datos.tipo,
            anio: datos.tipo === 'ORDINARIA' ? deuda.anio : new Date().getFullYear(),
            mes: detalle, // Usamos la columna 'mes' para guardar el detalle completo como en tu CSV
            monto_pagado: datos.monto,
            metodo: datos.metodo,
            fecha_registro: new Date()
        });
    
    return { ok: !errIns };
}

// --- HISTORIAL ---
async function getHistorialPagos() {
    const { data } = await clienteSupabase
        .from('pagos')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .limit(100);
    return data || [];
}

// --- GENERACIÓN MASIVA ---
// Réplica exacta de function generarCuotasMasivas(anio, mes)
async function generarCuotasMasivas(anio, mes) {
    // 1. Obtener Voluntarios Activos
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('rut')
        .eq('estado', 'ACTIVO'); // Equivalente a filtrar columna Activo = 'SI'

    if (!voluntarios) return { ok: false, msg: "No hay voluntarios activos" };

    // 2. Obtener Monto (Parametros)
    const { data: conf } = await clienteSupabase.from('configuracion').select('valor').eq('clave', 'CUOTA_NORMAL').single();
    const monto = conf ? Number(conf.valor) : 12000;

    // 3. Insertar
    const inserts = voluntarios.map(v => ({
        rut: v.rut,
        anio: anio,
        mes: mes,
        monto_base: monto,
        pagado: 'NO'
    }));

    const { error } = await clienteSupabase.from('cuotas_ordinarias').insert(inserts);
    
    if (error) return { ok: false, msg: error.message };
    return { ok: true, cantidad: inserts.length };
}

// --- GENERACIÓN EXTRA MASIVA ---
// Réplica exacta de function generarCobroExtraMasivo(motivo, monto)
async function generarCobroExtraMasivo(motivo, monto) {
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('rut')
        .eq('estado', 'ACTIVO');

    if (!voluntarios) return { ok: false, msg: "No hay voluntarios" };

    const inserts = voluntarios.map(v => ({
        rut: v.rut,
        motivo: motivo,
        monto: monto,
        pagado: 'NO',
        fecha_generacion: new Date()
    }));

    const { error } = await clienteSupabase.from('cuotas_extras').insert(inserts);

    if (error) return { ok: false, msg: error.message };
    return { ok: true, cantidad: inserts.length };
}

// Helpers
function normalizarRutJS(rut) {
    if (!rut) return "";
    return String(rut).toUpperCase().replace(/[^0-9K]/g, "");
}
function obtenerNombreMes(num) {
    const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return meses[num] || "Mes " + num;
}
