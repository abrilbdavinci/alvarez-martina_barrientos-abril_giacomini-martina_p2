// Este archivo va a inicializar Supabase y exportar el cliente.
// En este contexto, un servicio es un script que ofrece funciones
// o clases para utilizar alguna funcionalidad.

//supabase.js
import { createClient } from '@supabase/supabase-js';

// Definimos variables para las claves de supabase.
const SUPABASE_URL = 'https://vxwmcrdupntjindgjqnj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HdxnxO1f8IeeCXJ29UjmaA_utolCDvI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);