/**
 * hoja_vida_logic.js
 * Lógica para recopilar toda la información del voluntario.
 */

async function generarDatosHojaVida(rut) {
    const rutNorm = normalizarRut(rut);

    // 1. Datos Personales
    const { data: v, error } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('rut', rutNorm)
        .single();

    if (error || !v) return null;

    // 2. Premios (Asumiendo tabla 'premios')
    const { data: premios } = await clienteSupabase
        .from('premios')
        .select('premio, anio')
        .eq('rut', rutNorm)
        .order('anio', { ascending: true });

    // 3. Amonestaciones (Asumiendo tabla 'amonestaciones')
    const { data: castigos } = await clienteSupabase
        .from('amonestaciones')
        .select('medida, fecha')
        .eq('rut', rutNorm)
        .order('fecha', { ascending: false });

    // 4. Cargos (Asumiendo tabla 'historial_cargos')
    const { data: cargos } = await clienteSupabase
        .from('historial_cargos')
        .select('cargo, anio_inicio, anio_fin')
        .eq('rut', rutNorm)
        .order('anio_inicio', { ascending: false });

    // 5. Asistencia (Calculada o estática)
    // Aquí podrías hacer un count de la tabla asistencia. Por ahora devolvemos un objeto base.
    const asistencia = {
        total_listas: 0,
        asistidas: 0,
        porcentaje: "0%"
    };
    
    // Devolvemos objeto unificado igual que el original
    return {
        nombre: v.nombre,
        rut: v.rut,
        fechaIngreso: v.fecha_ingreso, // Asegúrate que tu columna se llame así
        fechaNacimiento: v.fecha_nacimiento,
        grupoSanguineo: v.grupo_sanguineo || "No reg.",
        alergias: v.alergias || "Ninguna",
        direccion: v.direccion,
        telefono: v.telefono,
        profesion: v.profesion || "No reg.",
        estadoCivil: v.estado_civil || "No reg.",
        cargas: v.cargas_familiares || "0",
        
        premiosCompania: premios || [],
        amonestaciones: castigos || [],
        cargos: cargos || [],
        asistencia: asistencia
    };
}
