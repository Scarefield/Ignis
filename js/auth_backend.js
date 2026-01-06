/**
 * auth_backend.js - Versión Limpia
 */

async function login(rolSolicitado, rut, clave) {
    
    // 1. Normalizar RUT
    const rBusq = normalizarRut(rut);

    // 2. Lógica Conductor (Tabla separada)
    if (rolSolicitado === 'conductor') {
        const { data: conductor, error } = await clienteSupabase
            .from('conductores')
            .select('*')
            .eq('rut', rBusq)
            .single();

        if (error || !conductor) {
            return { ok: false, msg: "Conductor no encontrado." };
        }

        return {
            ok: true,
            page: 'conductor_dashboard',
            nombre: conductor.nombre,
            rol: 'Conductor',
            rut: rBusq
        };
    }

    // 3. Lógica Voluntarios
    const { data: voluntario, error } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('rut', rBusq)
        .single();

    if (error || !voluntario) {
        return { ok: false, msg: "Usuario no encontrado." };
    }

    // Validar Estado
    const estado = String(voluntario.estado || '').toUpperCase();
    if (estado !== 'ACTIVO' && estado !== 'SI') {
        return { ok: false, msg: "Usuario inactivo." };
    }

    // Validar Clave
    if (String(voluntario.clave) !== String(clave)) {
        return { ok: false, msg: "Contraseña incorrecta." };
    }

    // Validar Rango y Rol
    const rolReal = String(voluntario.rol || '').toLowerCase().trim();
    const rolSol = rolSolicitado.toLowerCase().trim();

    if (rolSol === 'teniente') {
        if (!rolReal.includes('teniente')) {
             return { ok: false, msg: "No tiene rango de Teniente." };
        }
        return { ok: true, page: 'teniente_dashboard', nombre: voluntario.nombre, rol: voluntario.rol, rut: rBusq };
    }

    if (rolSol !== 'voluntario' && rolReal !== rolSol) {
        return { ok: false, msg: "No tiene permisos de " + rolSolicitado };
    }

    // Mapa de Destinos
    const destinos = {
        'capitan': 'capitan_dashboard',
        'tesorero': 'tesoreria',
        'ayudante': 'ayudantia',
        'jefe_guardia': 'jefe_guardia',
        'secretario': 'secretaria',
        'voluntario': 'voluntario_home',
        'maquinista': 'voluntario_home'
    };

    const paginaDestino = destinos[rolSol] || 'index';

    return { 
        ok: true, 
        page: paginaDestino, 
        nombre: voluntario.nombre, 
        rol: voluntario.rol, 
        rut: rBusq 
    };
}
