// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://ngkeabwqsjgyspjkghjl.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_8JBY2MDV3C5g1p1NbIA_XA_XILwosRc';

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("Supabase conectado");
