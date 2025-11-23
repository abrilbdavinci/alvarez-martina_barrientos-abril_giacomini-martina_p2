<script>
import AppH1 from '../components/AppH1.vue';
import PostTheme from '../components/PostTheme.vue';
import { RouterLink } from 'vue-router';
import { fetchUserProfileById } from '../services/user-profiles';
import { fetchPosts } from '../services/posts';
import { subscribeToAuthStateChanges } from '../services/auth';

export default {
  name: 'UsuarioPerfil',
  components: { AppH1, PostTheme, RouterLink },
  data() {
    return {
      user: {
        id: null,
        email: '',
        display_name: '',
        bio: '',
        goal: '',
      },
      posts: [],
      error: null,
    };
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    },
  },
  async mounted() {
    try {
      const userId = this.$route.params.id;

      if (!userId) throw new Error('No se proporcionó ID de usuario en la ruta.');

      // Traer perfil y posts en paralelo
      const [profile, allPosts] = await Promise.all([
        fetchUserProfileById(userId),
        fetchPosts(),
      ]);

      // Asegura que el perfil siempre tenga las keys necesarias
      this.user = {
        id: profile?.id || userId,
        email: profile?.email || '',
        display_name: profile?.display_name || '',
        bio: profile?.bio || '',
        goal: profile?.goal || '',
      };

      // Filtrar posts que pertenecen al usuario
      this.posts = allPosts.filter(post => post.sender_id === userId);
    } catch (err) {
      console.error('Error al cargar perfil o publicaciones:', err);
      this.error = err.message;
    }

    // Escuchar cambios de sesión
    subscribeToAuthStateChanges(newUser => {
      console.log('Cambio de sesión detectado:', newUser);
    });
  },
};
</script>


<template>
  <section class="w-full mx-auto  py-10">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6">
      <AppH1 class="text-3xl font-bold text-[#006165] mb-2 sm:mb-0">
        Perfil de {{ user.display_name || user.email }}
      </AppH1>
      <RouterLink v-if="$route.name === 'MiPerfil'" to="/mi-perfil/editar"
        class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[100px] transition-all duration-200">
        Editar perfil
      </RouterLink>
    </div>

    <section class="mb-10 p-6">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <div class="sm:col-span-2">
          <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Biografía</dt>
          <dd class="text-[#4B4B4B] p-2 italic whitespace-pre-wrap">{{ user.bio || 'Sin especificar' }}</dd>
        </div>
        <div>
          <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Email</dt>
          <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.email || 'Sin especificar'
            }}</dd>
        </div>
        <div>
          <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Usuario</dt>
          <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.display_name || 'Sin especificar' }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Objetivo</dt>
          <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.goal || 'Sin especificar' }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="mt-8" v-if="posts.length">
      <h2 class="text-xl font-bold text-[#006165] mb-6 border-b border-[#50B7C5] pb-2">Publicaciones de {{ user.email }}
      </h2>
      <ul class="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto">
        <li v-for="post in posts" :key="post.id"
          class="p-5 rounded-[20px] shadow-md border border-[#50B7C5] bg-white hover:shadow-lg transition duration-300">
          <PostTheme class="font-medium mb-2">{{ post.theme }}</PostTheme>
          <p class="text-base text-[#006165] mb-3 leading-relaxed">{{ post.content }}</p>
          <div class="text-xs text-gray-500 pt-2 border-t border-gray-100">{{ formatDate(post.created_at) }}</div>
        </li>
      </ul>
    </section>
  </section>
</template>
