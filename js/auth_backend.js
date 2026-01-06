/**
 * auth_backend.js - Lógica de Autenticación
 */

async function login(rolSolicitado, rut, clave) {
    const rBusq = normalizarRut(rut);

    // --- 1. LÓGICA DE CONDUCTORES ---
    if (rolSolicitado === 'conductor') {
        const { data: conductor, error } = await clienteSupabase
            .from('conductores')
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

    // --- 2. LÓGICA DE VOLUNTARIOS Y OFICIALES ---
    const { data: voluntario, error } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('rut', rBusq)
        .single();

    if (error || !voluntario) {
        return { ok: false, msg: "Usuario no encontrado en registros." };
    }

    if (voluntario.estado !== 'ACTIVO' && voluntario.estado !== 'SI') {
        return { ok: false, msg: "Usuario inactivo o suspendido." };
    }

    if (String(voluntario.clave) !== String(clave)) {
        return { ok: false, msg: "Contraseña incorrecta." };
    }

    const rolReal = String(voluntario.rol || '').toLowerCase().trim();
    const rolSol = rolSolicitado.toLowerCase().trim();

    // LÓGICA DE TENIENTES
    if (rolSol === 'teniente') {
        if (rolReal.includes('teniente')) {
             return { ok: true, page: 'teniente_dashboard', nombre: voluntario.nombre, rol: voluntario.rol, rut: rBusq };
        } else {
             return { ok: false, msg: "Usted no tiene rango de Teniente." };
        }
    }

    // LÓGICA RESTO DE OFICIALES
    if (rolSol !== 'voluntario' && rolReal !== rolSol) {
        return { ok: false, msg: "No tienes permisos de " + rolSolicitado };
    }

    // MAPA DE DESTINOS
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

    return { 
        ok: true, 
        page: paginaDestino, 
        nombre: voluntario.nombre, 
        rol: voluntario.rol, 
        rut: rBusq 
    };
} 
// <--- ASEGÚRATE DE QUE ESTA LLAVE FINAL EXISTA
  if (rolSol === 'voluntario') pageDestino = 'voluntario_home'; 

  return { ok: true, page: pageDestino, nombre: v.nombre, rol: v.rol, rut: rBusq };
}
