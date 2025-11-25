import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase.js'

// Importamos los componentes (páginas) con imports directos
import Home from "../pages/Home.vue";
import Publicaciones from "../pages/Publicaciones.vue";
import CrearPost from "../pages/CrearPost.vue";
import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import MiPerfil from "../pages/MiPerfil.vue";
import MiPerfilEditar from '../pages/MiPerfilEditar.vue';
import UsuarioPerfil from '../pages/UsuarioPerfil.vue';
import ChatPrivado from "../pages/ChatPrivado.vue";
import PostDetalle from "../pages/PostDetalle.vue";


const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/publicaciones', name: 'Publicaciones', component: Publicaciones },
  { path: '/post/:id', name: 'PostDetalle', component: PostDetalle, props: true },
  { path: '/crear-post', name: 'CrearPost', component: CrearPost, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'Register', component: Register, meta: { guestOnly: true } },
  { path: '/mi-perfil', name: 'MiPerfil', component: MiPerfil, meta: { requiresAuth: true } },
  { path: '/mi-perfil/editar', name: 'MiPerfilEditar', component: MiPerfilEditar, meta: { requiresAuth: true } },
  { path: '/usuario/:id', name: 'UsuarioPerfil', component: UsuarioPerfil, props: true },
  { path: '/usuario/:id/chat', name: 'ChatPrivado', component: ChatPrivado, props: true, meta: { requiresAuth: true } },
  
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { left: 0, top: 0 }
  }
})

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth)
  const guestOnly = to.matched.some(r => r.meta?.guestOnly)

  if (!requiresAuth && !guestOnly) return true

  try {
    const { data } = await supabase.auth.getUser()
    const user = data?.user ?? null

    if (requiresAuth && !user) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    if (guestOnly && user) {
      const redirectTo = to.query?.redirect || '/'
      return redirectTo
    }

    return true
  } catch (err) {
    console.error('Error en router guard:', err)
    if (requiresAuth) return { name: 'Login', query: { redirect: to.fullPath } }
    return true
  }
})

export default router
