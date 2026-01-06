/**
 * voluntario_backend.js
 * Lógica de negocio para el módulo de Voluntarios (Perfil, Clave, Historial)
 * Reemplaza a: Voluntario.gs
 */

/**
 * Obtiene el historial de llamados/actos para un voluntario en un mes específico.
 * Reemplaza a: getHistorialLlamadosVoluntario(rut, anio, mes)
 */
async function getHistorialLlamadosVoluntario(rut, anio, mes) {
    const rutNorm = normalizarRut(rut);
    
    // Convertir anio/mes a rango de fechas para consulta SQL
    // Supabase usa formato YYYY-MM-DD
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-31`; // PostgreSQL maneja esto bien

    // Consulta a la tabla 'registro_asistencia' (asumiendo que existe, o 'actos')
    // Debes tener una tabla que guarde la asistencia a actos
    const { data, error } = await clienteSupabase
        .from('registro_asistencia') 
        .select('*')
        .eq('rut_voluntario', rutNorm)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false });

    if (error) {
        console.error("Error obteniendo actos:", error);
        return [];
    }

    // Mapeo para que coincida con lo que espera tu HTML (voluntario_actos.html)
    return data.map(r => ({
        acto: r.acto_id || r.acto,       // ID del acto (ej: 10-0-1)
        tipo: r.tipo_asistencia,         // Ej: Abono, Obligacion
        direccion: r.direccion,
        fecha: r.fecha,                  // Supabase devuelve YYYY-MM-DD
        hora: r.hora,
        cargo: r.cargo_ocupado || ''
    }));
}

/**
 * Actualiza la clave del voluntario.
 * Reemplaza a: actualizarClaveVoluntario(rut, claveActual, nuevaClave)
 */
async function actualizarClaveVoluntario(rut, claveActual, nuevaClave) {
    const rutNorm = normalizarRut(rut);

    // 1. Verificar clave actual
    const { data: usuario, error: errBusq } = await clienteSupabase
        .from('voluntarios')
        .select('clave')
        .eq('rut', rutNorm)
        .single();

    if (errBusq || !usuario) {
        return { success: false, message: "Usuario no encontrado." };
    }

    if (String(usuario.clave) !== String(claveActual)) {
        return { success: false, message: "La contraseña actual es incorrecta." };
    }

    // 2. Actualizar clave
    const { error: errUpd } = await clienteSupabase
        .from('voluntarios')
        .update({ clave: nuevaClave })
        .eq('rut', rutNorm);

    if (errUpd) {
        return { success: false, message: "Error al actualizar: " + errUpd.message };
    }

    return { success: true, message: "Contraseña actualizada correctamente." };
}

/**
 * Obtiene historial de asistencia a academias/guardias (no actos).
 * Reemplaza a: getHistorialAsistenciaVoluntario(rut, anio, mes) de Guardia.gs/Voluntario.gs
 */
async function getHistorialAsistenciaVoluntario(rut, anio, mes) {
    const rutNorm = normalizarRut(rut);
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-31`;

    // Consulta a tabla 'asistencia_guardias' o similar
    const { data, error } = await clienteSupabase
        .from('asistencia_guardias')
        .select('*')
        .eq('rut', rutNorm)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false });

    if (error) return [];

    return data.map(r => ({
        fecha: r.fecha, // YYYY-MM-DD
        tipo: 'Guardia Nocturna' // O lo que venga de la BD
    }));
}
