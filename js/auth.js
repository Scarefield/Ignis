/**
 * LÓGICA DE AUTENTICACIÓN (Reemplaza a Auth.gs y Code.gs)
 */

async function autenticarUsuario(rolSolicitado, rut, clave) {
  const rBusq = normalizarRut(rut); 

  // --- 1. LÓGICA DE CONDUCTORES (PRIORIDAD ALTA) ---
  // Tal como en tu código original: Si es conductor, buscamos en tabla conductores
  // y NO pedimos clave (o usamos lógica especial).
  
  if (rolSolicitado === 'conductor') {
    // Consultamos tabla 'conductores'
    const { data: conductor, error } = await clienteSupabase
        .from('conductores') // Asegúrate de que esta tabla exista y tenga columna rut_voluntario o rut
        .select(`
            *,
            voluntarios ( nombre ) 
        `)
        .eq('rut_voluntario', rBusq) // Asumiendo que conductores se liga por RUT
        .maybeSingle();

    if (error) console.error("Error DB Conductores:", error);

    if (conductor) {
        // En tu lógica original no validabas clave para conductores aquí, se mantiene igual.
        // Recuperamos el nombre desde la relación o tabla
        const nombreCond = conductor.voluntarios ? conductor.voluntarios.nombre : "Conductor";
        
        return { 
            ok: true, 
            page: 'conductor_dashboard', 
            nombre: nombreCond,
            rol: 'Conductor', 
            rut: rBusq 
        };
    } else {
        return { ok: false, msg: "RUT no habilitado como Conductor." };
    }
  }

  // --- 2. RESTO DE ROLES (Buscan en tabla Voluntarios) ---
  
  // Buscamos al usuario por RUT
  const { data: v, error: errVol } = await clienteSupabase
    .from('voluntarios')
    .select('*')
    .eq('rut', rBusq)
    .maybeSingle();

  if (!v) {
      return { ok: false, msg: "Usuario no encontrado en registros." };
  }

  // Validar si está activo
  if (v.estado !== 'ACTIVO' && v.tipo !== 'INSIGNE') { // Ajusta según tu lógica de "Activo"
       // En tu código original: if (v.activo !== 'SI')...
       // Adaptamos a tu nueva DB donde estado es 'ACTIVO'/'INACTIVO'
       if(v.estado === 'INACTIVO') return { ok: false, msg: "Personal en situación de RETIRO o INACTIVO." };
  }

  // VALIDAR CONTRASEÑA
  // (Nota: En producción real deberíamos encriptar, pero mantenemos tu lógica exacta: texto plano por ahora)
  if (String(v.clave) !== clave) {
      return { ok: false, msg: "Contraseña incorrecta." };
  }

  // VALIDACIÓN DE ROLES
  const rolReal = String(v.rol).toLowerCase().trim();
  const rolSol = rolSolicitado.toLowerCase().trim();

  // Caso especial: TENIENTES
  if (rolSol === 'teniente') {
    if (rolReal.includes('teniente')) {
       return { ok: true, page: 'teniente_dashboard', nombre: v.nombre, rol: v.rol, rut: rBusq };
    } else {
       return { ok: false, msg: "Usted no tiene rango de Teniente." };
    }
  }
  
  // Caso especial: MAQUINISTA
  // En tu código original no había validación especial más que coincidencia o lógica de conductor.
  // Si seleccionó maquinista, debe ser maquinista en la BD.
  if (rolSol === 'maquinista') {
      // A veces los maquinistas tienen rol "Voluntario" pero son maquinistas. 
      // Si tu lógica original era estricta:
      if (!rolReal.includes('maquinista') && !rolReal.includes('voluntario')) { 
          // Ajusta esta línea si permites que voluntarios entren como maquinistas
          // return { ok: false, msg: "No figura como Maquinista." };
      }
      // Nota: Tu Auth.gs original NO tenía bloque específico para maquinista, 
      // caía en el "check general" o en conductor. Asumo check general:
  }

  // Validación General (Capitán, Tesorero, Ayudante, etc.)
  // Si el rol solicitado no coincide con el real (y no es voluntario entrando a voluntario)
  if (rolSol !== 'voluntario' && rolReal !== rolSol) {
      // Excepción: Si es Capitan y pide entrar como Voluntario, se suele permitir.
      // Pero tu código dice: if (rolReal !== rolSol) return false. Respetamos eso.
      return { ok: false, msg: "No tienes permisos de " + rolSolicitado + " (Tu rol es: " + v.rol + ")" };
  }

  // Mapeo de Destinos (Replica tu switch de Code.gs y objeto destinos de Auth.gs)
  const destinos = { 
    'capitan': 'capitan_dashboard',
    'tesorero': 'tesoreria', 
    'ayudante': 'ayudantia', 
    'jefe_guardia': 'jefe_guardia',
    'secretario': 'secretaria',
    'voluntario': 'voluntario_home', // O voluntario_actos según Code.gs
    'maquinista': 'conductor_dashboard' // Ojo: Maquinistas suelen usar dashboard conductor
  };

  // Default page si no está en la lista
  let pageDestino = destinos[rolSol] || 'index';
  
  // Ajuste fino basado en Code.gs
  if (rolSol === 'voluntario') pageDestino = 'voluntario_home'; 

  return { ok: true, page: pageDestino, nombre: v.nombre, rol: v.rol, rut: rBusq };
}
