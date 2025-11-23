import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../services/supabase";

// Importamos los componentes (páginas)
import Home from "../pages/Home.vue";
import Publicaciones from "../pages/Publicaciones.vue";
import CrearPost from "../pages/CrearPost.vue";
import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import MiPerfil from "../pages/MiPerfil.vue";
import MiPerfilEditar from '../pages/MiPerfilEditar.vue';
import UsuarioPerfil from '../pages/UsuarioPerfil.vue';

// Definimos la lista de rutas de nuestra aplicación.
// Cada objeto representa una ruta con su respectivo componente y metadatos opcionales.
const routes = [
  { path: "/", component: Home },
  { path: "/publicaciones", component: Publicaciones },
  { path: "/crear-post", component: CrearPost, meta: { requiresAuth: true } },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/mi-perfil", component: MiPerfil, meta: { requiresAuth: true } },
  { path: '/usuario/:id',         component: UsuarioPerfil,     meta: { requiresAuth: true, }, },
  { path: '/mi-perfil/editar', component: MiPerfilEditar, meta: { requiresAuth: true } },
];

// Creamos el router principal usando el historial HTML5 (sin hashes en la URL)
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Antes de cada navegación, verificamos si la ruta requiere autenticación.
// Si el usuario no está autenticado, lo redirigimos al login.
// Esta verificación mejora la **usabilidad**, pero no reemplaza la seguridad del backend.
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth) {
    // Obtenemos el usuario actual desde Supabase
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    // Si no hay usuario logueado, redirigimos al login
    if (!user) {
      return "/login";
    }
  }

  // Tanto "to" como "from" son objetos con información de la ruta
  // console.group('🚦 Rutas');
  // console.log("Navegando desde: ", from);
  // console.log("Navegando hacia: ", to);
  // console.groupEnd();
});

// Exportamos el router para usarlo en main.js
export default router;
