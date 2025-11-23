// auth.js
import { supabase } from "./supabase";
import {
  fetchUserProfileById,
  createUserProfile,
  updateUserProfile,
} from "./user-profiles";

/* Estado global del usuario y sistema de observers*/
let user = {
  id: null,
  email: null,
  display_name: null,
  bio: null,
  goal: null,
};

let observers = [];

/* intentar de obtener usuario actual*/
fetchCurrentAuthUserData();

/**
 * Intentar obtener los datos del usuario autenticado actualmente
 * desde Supabase al cargar la app.
 */
async function fetchCurrentAuthUserData() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    console.warn("[auth.js] No hay un usuario autenticado actualmente.");
    return;
  }

  user = {
    id: data.user.id,
    email: data.user.email,
  };

  notifyAll();

  // Traer perfil completo desde la tabla user_profiles
  await fetchFullProfile();
}

/* Traer perfil completo desde user_profiles*/
async function fetchFullProfile() {
  try {
    if (!user.id) return; // Evita error "uuid: undefined"

    const profile = await fetchUserProfileById(user.id);

    user = {
      ...user,
      ...profile,
    };

    notifyAll();
  } catch (error) {
    console.error(
      "[auth.js fetchFullProfile] Error al traer perfil completo:",
      error.message
    );
  }
}

/* Registro*/
/**
 * Registrar un nuevo usuario con email y contraseña
 * se crea el perfil en la tabla user_profiles.
 */
export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("[auth.js register] Error al crear el usuario:", error);
    throw new Error(error.message);
  }

  console.log("[auth.js register] Usuario registrado con éxito:", data);

  user = {
    id: data.user.id,
    email: data.user.email,
  };
  notifyAll();

  await createUserProfile({
    id: data.user.id,
    email: data.user.email,
  });
}

/* Login*/
/**
 * Inicia sesión con email y contraseña
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[auth.js login] Error al iniciar sesión:", error);
    throw new Error(error.message);
  }

  console.log("[auth.js login] Sesión iniciada correctamente:", data);

  user = {
    id: data.user.id,
    email: data.user.email,
  };

  notifyAll();
  fetchFullProfile();
}

/* Logout*/
export async function logout() {
  await supabase.auth.signOut();

  user = {
    id: null,
    email: null,
    display_name: null,
    bio: null,
    goal: null,
  };

  notifyAll();
}

/* Actualizar de datos del usuario*/
/**
 * Actualiza el perfil del usuario en Supabase y en la variable user.
 */
export async function updateAuthUser(data) {
  try {
    await updateUserProfile(user.id, data);

    user = {
      ...user,
      ...data,
    };

    notifyAll();
  } catch (error) {
    console.error(
      "[auth.js updateAuthUser] Error al actualizar usuario:",
      error.message
    );
  }
}

/* Observers*/
/**
 * Suscribe una función para escuchar cambios en el estado del usuario.
 * Devuelve una función que permite cancelar la suscripción.
 *
 * @param {Function} callback - Función que recibe los datos del usuario.
 */
export function subscribeToAuthStateChanges(callback) {
  observers.push(callback);
  console.log("[auth.js] Nuevo observer agregado. Total:", observers.length);

  // Notifica al observer con el estado actual
  notify(callback);

  // ESCUCHA cambios en la sesión de Supabase en tiempo real
  const { data: subscription } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      const newUserState = session?.user
        ? { id: session.user.id, email: session.user.email }
        : { id: null, email: null };

      user = { ...user, ...newUserState };

      notifyAll();

      // Si hay usuario trae el perfil completo
      if (session?.user) fetchFullProfile();
    }
  );

  // Retorna una función para cancelar suscripción y evitar memory leaks
  return () => {
    observers = observers.filter((obs) => obs !== callback);
    console.log("[auth.js] Observer eliminado. Total:", observers.length);
  };
}

/* Funciones internas para notificar cambios*/
/**
 * Notificar un solo observer y le pasa una COPIA (...) del usuario.
 */
function notify(callback) {
  callback({ ...user });
}

/**
 * Notificar a todos los observers con el estado actual.
 */
function notifyAll() {
  observers.forEach((cb) => notify(cb));
}
