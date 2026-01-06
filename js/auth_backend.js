/**
 * auth_backend.js
 * Lógica de Autenticación - Versión Corregida
 */

async function login(rolSolicitado, rut, clave) {
    console.log("Intentando login...", rolSolicitado, rut);

    // 1. Normalizar RUT
    const rBusq = normalizarRut(rut);

    // 2. Lógica para CONDUCTORES (Tabla separada, sin clave)
    if (rolSolicitado === 'conductor') {
        const { data: conductor, error } = await clienteSupabase
            .from('conductores') // Asegúrate que esta tabla exista en Supabase
            .select('*')
            .eq('rut', rBusq)
            .single();

        if (error || !conductor) {
            return { ok: false, msg: "Conductor no encontrado o no habilitado." };
        }

        return {
            ok: true,
            page: 'conductor_dashboard',
            nombre: conductor.nombre,
            rol: 'Conductor',
            rut: rBusq
        };
    }

    // 3. Lógica para VOLUNTARIOS Y OFICIALES
    const { data: voluntario, error } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('rut', rBusq)
        .single();

    if (error || !voluntario) {
        return { ok: false, msg: "Usuario no encontrado en registros." };
    }

    // Validar estado (ACTIVO o SI)
    // Nota: Ajusta esto según cómo guardes el estado en tu BD ('ACTIVO', 'SI', etc.)
    const estado = (voluntario.estado || '').toUpperCase();
    if (estado !== 'ACTIVO' && estado !== 'SI') {
        return { ok: false, msg: "Usuario inactivo o suspendido." };
    }

    // Validar contraseña
    if (String(voluntario.clave) !== String(clave)) {
        return { ok: false, msg: "Contraseña incorrecta." };
    }

    // Validar Roles
    const rolReal = String(voluntario.rol || '').toLowerCase().trim();
    const rolSol = rolSolicitado.toLowerCase().trim();

    // Caso Teniente
    if (rolSol === 'teniente') {
        if (rolReal.includes('teniente')) {
             return { ok: true, page: 'teniente_dashboard', nombre: voluntario.nombre, rol: voluntario.rol, rut: rBusq };
        } else {
             return { ok: false, msg: "Usted no tiene rango de Teniente." };
        }
    }

    // Caso Otros Oficiales
    if (rolSol !== 'voluntario' && rolReal !== rolSol) {
        return { ok: false, msg: "No tienes permisos de " + rolSolicitado };
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

    let paginaDestino = destinos[rolSol] || 'index';

    // Retorno final
    return { 
        ok: true, 
        page: paginaDestino, 
        nombre: voluntario.nombre, 
        rol: voluntario.rol, 
        rut: rBusq 
    };
}
