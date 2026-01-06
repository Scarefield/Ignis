/**
 * BACKEND DE TESORERÍA (Reemplaza a Tesoreria.gs)
 * Lógica de negocio migrada a Supabase.
 */

// Obtiene estadísticas para el Dashboard
async function getDatosDashboard() {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; // 1-12
    const anioActual = hoy.getFullYear();

    // 1. Calcular Recaudado este mes (Consulta SQL SUM)
    // Buscamos pagos realizados en el mes calendario actual
    const fechaInicio = new Date(anioActual, mesActual - 1, 1).toISOString();
    const fechaFin = new Date(anioActual, mesActual, 1).toISOString();

    const { data: pagos, error } = await clienteSupabase
        .from('pagos')
        .select('monto_pagado')
        .gte('fecha_registro', fechaInicio)
        .lt('fecha_registro', fechaFin);

    let recaudado = 0;
    if (pagos) {
        recaudado = pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0);
    }

    // 2. Obtener Meta (desde Configuración)
    const { data: config } = await clienteSupabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'META_RECAUDACION')
        .single();
    
    const meta = config ? Number(config.valor) : 500000; // Default fallback

    // 3. Calcular Morosos (Simple conteo de deudas ordinarias > 3)
    // Esta es una estimación rápida.
    const { count: morosos } = await clienteSupabase
        .from('cuotas_ordinarias')
        .select('*', { count: 'exact', head: true })
        .eq('pagado', 'NO')
        .lt('mes', mesActual - 2); // Deudas de hace 3 meses o más

    return { recaudado, meta, morosos: morosos || 0 };
}

// Obtiene la lista combinada de Cuotas Ordinarias y Extras pendientes
async function getListaCobro() {
    let listaFinal = [];

    // 1. Obtener Voluntarios (Para mapear RUT a Nombre)
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('rut, nombre');
    
    // Crear mapa para búsqueda rápida
    const mapaNombres = {};
    if (voluntarios) {
        voluntarios.forEach(v => {
            // Normalizamos keys para evitar errores de puntos/guiones
            mapaNombres[normalizarRutJS(v.rut)] = v.nombre;
        });
    }

    // 2. Traer Cuotas Ordinarias Pendientes
    const { data: ords } = await clienteSupabase
        .from('cuotas_ordinarias')
        .select('*')
        .eq('pagado', 'NO');

    if (ords) {
        ords.forEach(o => {
            const rutLimpio = normalizarRutJS(o.rut);
            listaFinal.push({
                id: o.id, // ID único de la tabla
                tipo: 'ORDINARIA',
                rut: o.rut,
                nombre: mapaNombres[rutLimpio] || "Desconocido (" + o.rut + ")",
                detalle: `Cuota ${obtenerNombreMes(o.mes)} ${o.anio}`,
                monto: o.monto_base
            });
        });
    }

    // 3. Traer Cuotas Extras Pendientes
    const { data: extras } = await clienteSupabase
        .from('cuotas_extras')
        .select('*')
        .eq('pagado', 'NO');

    if (extras) {
        extras.forEach(e => {
            const rutLimpio = normalizarRutJS(e.rut);
            listaFinal.push({
                id: e.id,
                tipo: 'EXTRA',
                rut: e.rut,
                nombre: mapaNombres[rutLimpio] || "Desconocido",
                detalle: e.motivo,
                monto: e.monto
            });
        });
    }

    return listaFinal;
}

// Registra el pago: Inserta en historial y actualiza la deuda
async function registrarPago(datos) {
    // datos = { id, tipo, monto, metodo }

    // 1. Averiguar RUT y Detalle antes de guardar (para el historial)
    let tabla = datos.tipo === 'ORDINARIA' ? 'cuotas_ordinarias' : 'cuotas_extras';
    
    const { data: deuda } = await clienteSupabase
        .from(tabla)
        .select('*')
        .eq('id', datos.id)
        .single();
    
    if (!deuda) return { ok: false, msg: "Deuda no encontrada" };

    let detalleHistorial = datos.tipo === 'ORDINARIA' 
        ? `Cuota ${deuda.mes}/${deuda.anio}` 
        : deuda.motivo;

    // 2. Insertar en Pagos (Historial)
    const { error: errIns } = await clienteSupabase
        .from('pagos')
        .insert({
            rut: deuda.rut,
            tipo: datos.tipo,
            anio: datos.tipo === 'ORDINARIA' ? deuda.anio : new Date().getFullYear(),
            mes: detalleHistorial,
            monto_pagado: datos.monto,
            metodo: datos.metodo
        });

    if (errIns) return { ok: false, msg: errIns.message };

    // 3. Marcar deuda como PAGADA
    const { error: errUpd } = await clienteSupabase
        .from(tabla)
        .update({ pagado: 'SI' })
        .eq('id', datos.id);

    if (errUpd) return { ok: false, msg: "Pago guardado pero error al actualizar deuda." };

    return { ok: true };
}

async function getHistorialPagos() {
    const { data, error } = await clienteSupabase
        .from('pagos')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .limit(200); // Límite por rendimiento
    
    return data || [];
}

// Generación Masiva (Lo que hacía el botón del Excel)
async function generarCuotasMasivas(anio, mes) {
    // 1. Obtener lista de voluntarios ACTIVOS
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('rut, tipo') // Tipo: Activo, Honorario, etc.
        .eq('estado', 'ACTIVO');

    if (!voluntarios || voluntarios.length === 0) return { ok: false, msg: "No hay voluntarios activos" };

    // 2. Obtener monto cuota (Parametros)
    // (Podríamos leer config, pero por defecto usamos 12000 si no está)
    // Simplicidad: Usamos 12000 fijos o lógica de estudiante
    // Si quieres ser estricto con el Excel, deberíamos leer el parametro.
    const { data: conf } = await clienteSupabase.from('configuracion').select('valor').eq('clave', 'CUOTA_NORMAL').single();
    const montoNormal = conf ? Number(conf.valor) : 12000;
    
    // Preparar el array para insertar masivamente
    const filasInsertar = voluntarios.map(v => ({
        rut: v.rut,
        anio: anio,
        mes: mes,
        monto_base: montoNormal, // Aquí podrías poner lógica si es estudiante = mitad
        pagado: 'NO'
    }));

    // 3. Insertar
    const { error } = await clienteSupabase
        .from('cuotas_ordinarias')
        .insert(filasInsertar);

    if (error) return { ok: false, msg: error.message };
    return { ok: true, cantidad: filasInsertar.length };
}

async function generarCobroExtraMasivo(motivo, monto) {
    const { data: voluntarios } = await clienteSupabase
        .from('voluntarios')
        .select('rut')
        .eq('estado', 'ACTIVO');

    if (!voluntarios) return { ok: false, msg: "No hay voluntarios" };

    const filas = voluntarios.map(v => ({
        rut: v.rut,
        motivo: motivo,
        monto: monto,
        pagado: 'NO',
        fecha_generacion: new Date()
    }));

    const { error } = await clienteSupabase
        .from('cuotas_extras')
        .insert(filas);

    if (error) return { ok: false, msg: error.message };
    return { ok: true, cantidad: filas.length };
}

// Helpers Locales
function normalizarRutJS(rut) {
    if (!rut) return "";
    return String(rut).toUpperCase().replace(/[^0-9K]/g, "");
}

function obtenerNombreMes(num) {
    const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return meses[num] || "Mes " + num;
}
