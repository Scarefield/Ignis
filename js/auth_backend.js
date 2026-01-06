/**
 * auth_backend.js - Lógica de Autenticación
 * Reemplaza a Auth.gs
 */

async function login(rolSolicitado, rut, clave) {
    // 1. Normalizar RUT
    const rBusq = normalizarRut(rut);

    // 2. Lógica para CONDUCTORES (Sin clave, tabla separada)
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
    if (voluntario.estado !== 'ACTIVO' && voluntario.estado !== 'SI') {
        return { ok: false, msg: "Usuario inactivo o suspendido." };
    }

    // Validar contraseña
    if (String(voluntario.clave) !== String(clave)) {
        return { ok: false, msg: "Contraseña incorrecta." };
    }

    // Validar Roles Específicos
    const rolReal = String(voluntario.rol || '').toLowerCase().trim();
    const rolSol = rolSolicitado.toLowerCase().trim();

    // Caso Teniente (Validación especial de rango)
    if (rolSol === 'teniente') {
        if (rolReal.includes('teniente')) {
             return { ok: true, page: 'teniente_dashboard', nombre: voluntario.nombre, rol: voluntario.rol, rut: rBusq };
        } else {
             return { ok: false, msg: "Usted no tiene rango de Teniente." };
        }
    }

    // Caso Otros Oficiales (El rol debe coincidir)
    if (rolSol !== 'voluntario' && rolReal !== rolSol) {
        return { ok: false, msg: "No tienes permisos de " + rolSolicitado };
    }

    // 4. Mapa de Redirección (Igual a Auth.gs)
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

    // Retorno final de éxito
    return { 
        ok: true, 
        page: paginaDestino, 
        nombre: voluntario.nombre, 
        rol: voluntario.rol, 
        rut: rBusq 
    };

} // <--- ESTA LLAVE CIERRA LA FUNCIÓN PRINCIPAL. ES VITAL.
  if (rolSol === 'voluntario') pageDestino = 'voluntario_home'; 

  return { ok: true, page: pageDestino, nombre: v.nombre, rol: v.rol, rut: rBusq };
}
