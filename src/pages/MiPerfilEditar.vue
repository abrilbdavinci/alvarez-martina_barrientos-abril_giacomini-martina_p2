<script>
import AppH1 from '../components/AppH1.vue';
import { subscribeToAuthStateChanges, updateAuthUser } from '../services/auth';
import { fetchUserProfileById } from '../services/user-profiles.js';
import { fetchPosts } from '../services/posts';
import PostTheme from '../components/PostTheme.vue';

let unsubscribeFromAuth = null;

export default {
    name: 'MiPerfilEditar',
    components: { AppH1, PostTheme },
    data() {
        return {
            formData: {
                id: null,
                email: null,
                display_name: null,
                bio: null,
                goal: null
            },
            posts: [],
            loading: false,
        }
    },
    methods: {
        async handleSubmit() {
            try {
                this.loading = true;

                // Actualiza los datos del usuario autenticado
                await updateAuthUser(this.formData);

                // Trae la versión actualizada desde Supabase
                const updatedProfile = await fetchUserProfileById(this.formData.id);
                this.formData = { ...this.formData, ...updatedProfile };

                // Redirigir al perfil actualizado
                this.$router.push('/mi-perfil');
            } catch (error) {
                console.error("Error al actualizar perfil:", error);
            } finally {
                this.loading = false;
            }
        },

        async loadUserPosts() {
            if (!this.formData.email) {
                this.posts = [];
                return;
            }
            const allPosts = await fetchPosts();
            this.posts = allPosts.filter(p => p.user_email === this.formData.email);
        },

        async loadUserProfilel(userId) {
            try {
                this.loading = true;
                const profile = await fetchUserProfileById(userId);
                this.formData = { ...this.formData, ...profile };

                // Cargar publicaciones del usuario
                await this.loadUserPosts();
            } catch (error) {
                console.error("Error al cargar perfil:", error);
            } finally {
                this.loading = false;
            }
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }
    },

    mounted() {
        unsubscribeFromAuth = subscribeToAuthStateChanges(async newUserState => {
            this.formData = {
                display_name: newUserState.display_name,
                bio: newUserState.bio,
                goal: newUserState.goal,
            }

            if (!newUserState?.id) return;

            this.formData.id = newUserState.id;
            this.formData.email = newUserState.email;

            // Cargar perfil completo y publicaciones
            this.loadUserProfile(newUserState.id);
        });
    },

    unmounted() {
        unsubscribeFromAuth();
    }
}
</script>

<template>
    <section class="w-full mx-auto  py-10">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6">
            <AppH1 class="text-3xl font-bold text-[#006165] mb-2 sm:mb-0">
                Editar mi perfil
            </AppH1>
        </div>

        
        <form @submit.prevent="handleSubmit" class="mb-10 p-6">
            <div class="mb-3">
                <label for="bio" class="block mb-1 font-semibold text-[#006165]">Biografía</label>
                <textarea id="bio"
                    class="w-full p-2 border border-gray-400 rounded-[20px] focus:ring-2 focus:ring-[#179BAE] outline-none"
                    v-model="formData.bio" rows="4"></textarea>
            </div>

            <div class="mb-3">
                <label for="display_name" class="block mb-1 font-semibold text-[#006165]">Usuario</label>
                <input type="text" id="display_name"
                    class="w-full p-2 border border-gray-400 rounded-[100px] focus:ring-2 focus:ring-[#179BAE] outline-none"
                    v-model="formData.display_name">
            </div>

            <div class="mb-3">
                <label for="goal" class="block mb-1 font-semibold text-[#006165]">Objetivo</label>
                <input type="text" id="goal"
                    class="w-full p-2 border border-gray-400 rounded-[100px] focus:ring-2 focus:ring-[#179BAE] outline-none"
                    v-model="formData.goal">
            </div>

            <button type="submit"
                class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] transition-all duration-200 hover:bg-[#0f7d8d]"
                >Actualizar perfil
            </button>
            
        </form>
    </section>
</template>
