<script>
import AppH1 from '../components/AppH1.vue';
import { createPost } from '../services/posts';
import { subscribeToAuthStateChanges } from '../services/auth';

let unsubscribeFromAuth = () => {};

export default {
  name: 'CrearPost',
  components: { AppH1 },

  data() {
    return {
      post: {
        content: '',
        theme: '',
      },
      user: {
        id: null,
        email: null,
        display_name: null,
        bio: null,
        career: null,
      },
      loading: false,
    };
  },

  methods: {
    async handleSubmit() {
      if (!this.post.content.trim() || !this.user?.id) return;

      try {
        this.loading = true;

        await createPost({
          sender_id: this.user.id,
          user_email: this.user.email,
          theme: this.post.theme,
          content: this.post.content,
        });

        // Limpiar contenido
        this.post.content = '';

        // Redirige a la ruta de las publicaciones
        this.$router.push('/publicaciones');
      } catch (error) {
        console.error('Error al crear post:', error);
        alert('No se pudo crear el post. Revisa la consola.');
      } finally {
        this.loading = false;
      }
    },
  },

  async mounted() {
    // Suscribirse a los cambios de autenticación
    unsubscribeFromAuth = subscribeToAuthStateChanges(newUserState => {
      this.user = newUserState;
    });
  },

  unmounted() {
    unsubscribeFromAuth();
  },
};
</script>

<template>
  <div class="flex justify-center items-start min-h-[80vh] ">
    <div class="w-5xl p-8 rounded-[100px] flex flex-col gap-6">
      
      <AppH1 class="text-[#006165] text-center text-2xl">
        Crear nuevo post
      </AppH1>

      
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Tema -->
        <div class="flex flex-col gap-1">
          <label class="text-[#4B4B4B] font-medium">Tema</label>
          <select
            v-model="post.theme"
            class="w-full p-3 rounded-[100px] text-[#1A1A1A] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#179BAE]"
          >
            <option value="haircare">Haircare</option>
            <option value="skincare">Skincare</option>
          </select>
        </div>

        
        <div class="flex flex-col gap-1">
          <label class="text-[#4B4B4B] font-medium">Contenido</label>
          <textarea
            v-model="post.content"
            rows="6"
            class="w-full p-3 rounded-[20px] text-[#1A1A1A] resize-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#179BAE]"
          ></textarea>
        </div>

        
        <button
          type="submit"
          :disabled="loading"
          class="w-40 bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] transition-all duration-200 disabled:opacity-50"
        >
          Publicar
        </button>
      </form>
    </div>
  </div>
</template>
