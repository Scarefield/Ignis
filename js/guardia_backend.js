/**
 * BACKEND GUARDIA (Gestión + Bitácora + Calendario)
 * Traducción exacta de la lógica GAS a Supabase JS
 */

// --- CONFIGURACIÓN ---
async function getConfiguracionCamas() {
    const { data } = await clienteSupabase.from('config_guardia').select('*');
    let config = { hombres: 8, mujeres: 5 }; // Default
    if (data) {
        data.forEach(Row => {
            if (Row.clave === 'CuposHombres') config.hombres = Row.valor;
            if (Row.clave === 'CuposMujeres') config.mujeres = Row.valor;
        });
    }
    return config;
}

async function guardarConfiguracionCamas(h, m) {
    const upserts = [
        { clave: 'CuposHombres', valor: h },
        { clave: 'CuposMujeres', valor: m }
    ];
    const { error } = await clienteSupabase.from('config_guardia').upsert(upserts);
    return { ok: !error };
}

// --- GUARDIANES PERMANENTES ---
async function getGuardianesPermanentes() {
    const { data } = await clienteSupabase.from('guardianes_permanentes').select('*');
    if (!data) return [];
    // Mapeamos para que el frontend reciba exactamente lo que espera
    return data.map(d => ({
        rut: d.rut,
        nombre: d.nombre,
        genero: d.genero,
        dias: d.dias_semana, // Viene como JSON array [1,3]
        cama: d.cama_default
    }));
}

async function guardarGuardianPermanente(rut, nombre, genero, dias, cama) {
    // Upsert (Insertar o Actualizar)
    const { error } = await clienteSupabase
        .from('guardianes_permanentes')
        .upsert({
            rut: rut,
            nombre: nombre,
            genero: genero,
            dias_semana: dias, // Supabase guarda arrays JSON automáticamente
            cama_default: cama
        });
    
    if (error) return { ok: false, msg: error.message };
    return { ok: true, msg: "Asignado correctamente" };
}

async function eliminarPermanente(rut) {
    await clienteSupabase.from('guardianes_permanentes').delete().eq('rut', rut);
}

// --- CALENDARIO (Lógica Compleja) ---
async function getCalendarioData(anio, mes) {
    // 1. Obtener Permanentes
    const permanentes = await getGuardianesPermanentes();
    
    // 2. Obtener Solicitudes Aprobadas del Mes (si las tuvieras en otra tabla, por ahora usamos permanentes)
    // (Si tienes tabla solicitudes_guardia, agrégala aquí)
    
    const diasEnMes = new Date(anio, mes, 0).getDate();
    let calendario = {}; // Objeto { 1: [], 2: [] ... }

    // Generar datos día a día
    for (let dia = 1; dia <= diasEnMes; dia++) {
        let fecha = new Date(anio, mes - 1, dia);
        let diaSemana = fecha.getDay(); // 0=Dom, 1=Lun...
        
        calendario[dia] = [];

        // Agregar Permanentes que tocan este día
        permanentes.forEach(p => {
            if (p.dias.includes(diaSemana)) {
                calendario[dia].push({
                    nombre: p.nombre,
                    genero: p.genero,
                    cama: p.cama
                });
            }
        });
    }
    
    return calendario;
}

// --- HELPERS VOLUNTARIOS ---
async function getVoluntariosActivos() {
    // Misma función que usamos en otros lados, busca en tabla voluntarios
    const { data } = await clienteSupabase
        .from('voluntarios')
        .select('rut, nombre, registro_anual') // registro_anual podría tener genero si no está en columna
        .eq('estado', 'ACTIVO')
        .order('nombre');
        
    return data || [];
}

// --- BITÁCORA (Jefe Guardia) ---
async function getBitacoraDia(fecha) {
    const { data } = await clienteSupabase
        .from('bitacora_novedades')
        .select('*')
        .eq('fecha', fecha)
        .maybeSingle();
    return data;
}

async function saveBitacora(obj) {
    // Buscar si existe para hacer update o insert
    const existe = await getBitacoraDia(obj.fecha);
    
    let error;
    if (existe) {
        // Update
        const { error: err } = await clienteSupabase
            .from('bitacora_novedades')
            .update(obj)
            .eq('id', existe.id);
        error = err;
    } else {
        // Insert
        const { error: err } = await clienteSupabase
            .from('bitacora_novedades')
            .insert(obj);
        error = err;
    }
    return { ok: !error };
}

// Helper para copiar permanentes a la bitácora
async function getPermanentesDia(fechaStr) {
    // fechaStr = "2026-01-20"
    const partes = fechaStr.split('-');
    const fecha = new Date(partes[0], partes[1]-1, partes[2]);
    const diaSem = fecha.getDay(); // 0-6

    const perms = await getGuardianesPermanentes();
    let nombres = [];
    perms.forEach(p => {
        if (p.dias.includes(diaSem)) nombres.push(p.nombre);
    });
    return nombres;
}

// --- RESUMEN MENSUAL ---
async function getResumenGuardias(anio, mes) {
    // Aquí implementas la lógica de contar asistencias
    // 1. Traer bitácoras del mes
    const inicio = `${anio}-${mes}-01`;
    const fin = `${anio}-${mes}-31`; // SQL tolera esto

    const { data: bitacoras } = await clienteSupabase
        .from('bitacora_novedades')
        .select('presentes, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin);

    let conteo = {}; // { "Juan Perez": 5, ... }

    if (bitacoras) {
        bitacoras.forEach(b => {
            if (b.presentes) {
                const lista = b.presentes.split(',');
                lista.forEach(nombreRaw => {
                    const nom = nombreRaw.trim();
                    if (nom) {
                        if (!conteo[nom]) conteo[nom] = 0;
                        conteo[nom]++;
                    }
                });
            }
        });
    }

    // Convertir a array para tabla
    let resultado = Object.keys(conteo).map(k => ({
        nombre: k,
        tipo: 'Voluntario', // Podrías buscar el tipo real si quieres
        noches: conteo[k]
    }));
    
    // Ordenar por noches descendente
    resultado.sort((a,b) => b.noches - a.noches);
    return resultado;
}
