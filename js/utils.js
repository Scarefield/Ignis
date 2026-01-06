/**
 * utils.js - Utilidades Globales del Sistema
 * Reemplaza a Utils.gs manteniendo la misma lógica de negocio.
 */

// Normaliza el RUT (quita puntos, guión y deja K mayúscula)
function normalizarRut(rut) {
    if (!rut) return '';
    return rut.toString().replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
}

// Formatea RUT para visualización (12.345.678-K)
function formatearRut(rut) {
    let r = normalizarRut(rut);
    if (r.length < 2) return r;
    
    let dv = r.slice(-1);
    let cuerpo = r.slice(0, -1);
    
    // Formato con puntos
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}

// Obtiene todos los voluntarios (Caché inteligente para no saturar Supabase)
async function getTodosLosVoluntarios() {
    // Equivalente a leer la hoja "Voluntarios"
    const { data, error } = await clienteSupabase
        .from('voluntarios')
        .select('*');

    if (error) {
        console.error("Error obteniendo voluntarios:", error);
        return [];
    }

    // Mapeamos para que coincida EXACTAMENTE con la estructura que tu código espera
    // (Tu código usa claves como: rut, nombre, clave, tipo, rol...)
    return data.map(v => ({
        rut: v.rut,
        nombre: v.nombre,
        clave: v.clave,
        tipo: v.tipo,
        subtipo: v.subtipo,
        email: v.email,
        telefono: v.telefono,
        activo: v.estado, // En DB se llama 'estado', tu código espera 'activo' (SI/NO)
        rol: v.rol
    }));
}

// Busca nombre por RUT (Síncrono si ya tienes la lista, o asíncrono si consultas DB)
async function obtenerNombrePorRut(rutBusqueda) {
    const rutLimpio = normalizarRut(rutBusqueda);
    const { data } = await clienteSupabase
        .from('voluntarios')
        .select('nombre')
        .eq('rut', rutLimpio)
        .single();
        
    return data ? data.nombre : "Desconocido";
}
