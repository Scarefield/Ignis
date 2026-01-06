/**
 * auth_backend.js - Lógica de Autenticación
 * Reemplaza a Auth.gs
 */

async function login(rolSolicitado, rut, clave) {
    const rBusq = normalizarRut(rut);

    // --- 1. LÓGICA DE CONDUCTORES (PRIORIDAD ALTA - Sin Clave) ---
    if (rolSolicitado === 'conductor') {
        const { data: conductor, error } = await clienteSupabase
            .from('conductores')
            .select('*')
            .eq('rut', rBusq) // Asumiendo que la tabla conductores tiene columna 'rut'
            .single();

        if (error || !conductor) {
            return { ok: false, msg: "Conductor no encontrado o no habilitado." };
        }

        return {
            ok: true,
            page: 'conductor_dashboard', // Redirigirá a conductor_dashboard.html
            nombre: conductor.nombre,
            rol: 'Conductor',
            rut: rBusq
        };
    }

    // --- 2. LÓGICA DE VOLUNTARIOS Y OFICIALES ---
    // Buscamos en la tabla principal
    const { data: voluntario, error } = await clienteSupabase
        .from('voluntarios')
        .select('*')
        .eq('rut', rBusq)
        .single();

    if (error || !voluntario) {
        return { ok: false, msg: "Usuario no encontrado en registros." };
    }

    // Validación de Estado
    if (voluntario.estado !== 'ACTIVO' && voluntario.estado !== 'SI') {
        return { ok: false, msg: "Usuario inactivo o suspendido." };
    }

    // Validación de Clave (Excepto si tu lógica permitía entrar sin clave a ciertos roles, aquí aplicamos la de Auth.gs)
    // Nota: Auth.gs original validaba: if (String(v.clave) !== clave) ...
    if (String(voluntario.clave) !== String(clave)) {
        return { ok: false, msg: "Contraseña incorrecta." };
    }

    const rolReal = String(voluntario.rol || '').toLowerCase().trim();
    const rolSol = rolSolicitado.toLowerCase().trim();

    // --- LÓGICA DE TENIENTES ---
    if (rolSol === 'teniente') {
        if (rolReal.includes('teniente')) {
             return { ok: true, page: 'teniente_dashboard', nombre: voluntario.nombre, rol: voluntario.rol, rut: rBusq };
        } else {
             return { ok: false, msg: "Usted no tiene rango de Teniente." };
        }
    }

    // --- LÓGICA RESTO DE OFICIALES ---
    // Si pide ser Capitán, debe ser Capitán, etc.
    // Excepción: 'voluntario' suele ser el rol base, si tu Auth.gs permitía acceso a dashboard voluntario a cualquiera, mantenlo.
    // Según tu Auth.gs: if (rolReal !== rolSol) return { ok: false ... }
    
    if (rolSol !== 'voluntario' && rolReal !== rolSol) {
        // Pequeño ajuste de seguridad: Un Capitán puede entrar como Voluntario si quiere, 
        // pero aquí seguimos tu regla estricta: Rol Solicitado debe coincidir con Rol Real.
        return { ok: false, msg: "No tienes permisos de " + rolSolicitado };
    }

    // MAPA DE DESTINOS (Igual a Auth.gs)
    const destinos = {
        'capitan': 'capitan_dashboard',
        'tesorero': 'tesoreria',
        'ayudante': 'ayudantia',
        'jefe_guardia': 'jefe_guardia',
        'secretario': 'secretaria',
        'voluntario': 'voluntario_home', // Agregado para completar
        'maquinista': 'voluntario_home'  // Asumo que maquinistas ven vista de voluntario o tienen dashboard propio? En tu code.gs vi voluntario_home
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
  if (rolSol === 'voluntario') pageDestino = 'voluntario_home'; 

  return { ok: true, page: pageDestino, nombre: v.nombre, rol: v.rol, rut: rBusq };
}
