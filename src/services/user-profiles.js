import { supabase } from "./supabase";

// funciones que tengan que ver con el manejo de las tablas de usuario./**
//  *
/**
 * Llamar perfil de un usuario por su ID.
 * @param {string} id
 * @returns {Promise<Object>} Perfil del usuario
 */
export async function fetchUserProfileById(id) {
    const { data, error } = await supabase
        .from('user_profiles')  // tabla de schema auth de Supabase
        .select()
        .eq('id', id)           // WHERE id = ...
        //eq es equals
        //Agrega una condicion de igualdad en el WHERE
        
        .limit(1)               // traer solo 1 registro
        .single();              // indica a Supabase que se quiere solo el objeto del registro y no el array de objetos.
    
    if(error) {
        console.error('[user.js fetchUserProfileById] Error al traer el perfil del usuario:', id, error);
        throw new Error(error.message);
    }

    return data;
}

/**
 * Crear un perfil de usuario en la tabla user_profiles
 * @param {Object} data
 */
export async function createUserProfile(data) {
    const { error } = await supabase
        .from('user_profiles')
        .insert(data);

    if(error) {
        console.error('[user.js createUserProfile] Error al crear el usuario:', error);
        throw new Error(error.message);
    }
}

/**
 * Actualizar un perfil de usuario
 * @param {string} id
 * @param {Object} data
 */
export async function updateUserProfile(id, data) {
    const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', id);

    if(error) {
        console.error('[user.js updateUserProfile] Error al actualizar el usuario:', id, error);
        throw new Error(error.message);
    }
}
