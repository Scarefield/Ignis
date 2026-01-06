/**
 * UTILIDADES GENERALES (Reemplazo de Utils.gs)
 */

function normalizarRut(rut) {
  if (!rut) return '';
  // Convierte a string, quita puntos, guiones y espacios, y pasa a mayúsculas
  return rut.toString().replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
}

/**
 * Busca el nombre (aunque ahora usaremos consultas directas a DB, dejamos esto por compatibilidad si se usa localmente)
 */
function obtenerNombrePorRut(rutBusqueda, listaVoluntarios) {
  const rutLimpio = normalizarRut(rutBusqueda);
  const voluntario = listaVoluntarios.find(v => normalizarRut(v.rut) === rutLimpio); 
  return voluntario ? voluntario.nombre : "Desconocido";
}

// Función auxiliar para formatear RUT con puntos y guión (si la necesitas visualmente)
function formatearRut(rut) {
  let r = normalizarRut(rut);
  if (r.length < 2) return r;
  
  let dv = r.slice(-1);
  let cuerpo = r.slice(0, -1);
  
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}
