<script>
import { RouterLink } from 'vue-router';
import AppH1 from '../components/AppH1.vue';
import PostTheme from '../components/PostTheme.vue';
import { subscribeToAuthStateChanges } from '../services/auth';
import { fetchPosts } from '../services/posts';
import { fetchUserProfileById } from '../services/user-profiles';

let unsubscribeFromAuth = () => { };

export default {
    name: 'MiPerfil',
    components: { AppH1, RouterLink, PostTheme },
    data() {
        return {
            user: {
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
        async loadUserProfile(userId) {
            try {
                this.loading = true;
                const profile = await fetchUserProfileById(userId);
                this.user = { ...this.user, ...profile };
                await this.loadUserPosts();
            } catch (error) {
                console.error("Error al cargar perfil:", error);
            } finally {
                this.loading = false;
            }
        },
        async loadUserPosts() {
            if (!this.user.email) return;
            const allPosts = await fetchPosts();
            this.posts = allPosts.filter(p => p.user_email === this.user.email);
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    },
    mounted() {
        // Suscribirse al estado de autenticación y cargar perfil completo
        unsubscribeFromAuth = subscribeToAuthStateChanges(async newUserState => {
            if (!newUserState?.id) return;

            this.user = newUserState;
            await this.loadUserProfile(newUserState.id);
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
            <AppH1 class="text-3xl font-bold text-[#006165] mb-2 sm:mb-0">Mi perfil</AppH1>
            <RouterLink to="/mi-perfil/editar"
                class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[100px] transition-all duration-200">Editar
                perfil</RouterLink>
        </div>

        <section class="mb-10 p-6">
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div class="sm:col-span-2">
                    <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Biografía</dt>
                    <dd class="text-[#4B4B4B] p-2 italic whitespace-pre-wrap">{{ user.bio || 'Sin especificar' }}</dd>
                </div>
                <div>
                    <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Email</dt>
                    <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.email || 'Sin especificar' }}</dd>
                </div>
                <div>
                    <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Usuario</dt>
                    <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.display_name ||
                        'Sin especificar' }}</dd>
                </div>
                <div class="sm:col-span-2">
                    <dt class="mb-1 font-bold text-[#006165] uppercase text-sm">Objetivo</dt>
                    <dd class="text-[#4B4B4B] p-2 bg-white rounded-lg border border-gray-200">{{ user.goal || 'Sin especificar' }}</dd>
                </div>

            </dl>
        </section>

        <section class="mt-8">
            <h2 class="text-xl font-bold text-[#006165] mb-6 border-b border-[#50B7C5] pb-2">Mis publicaciones</h2>
            <ul v-if="posts.length" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto">
                <li v-for="post in posts" :key="post.id"
                    class="p-5 rounded-[20px] shadow-md border border-[#50B7C5] bg-white hover:shadow-lg transition duration-300">
                    <PostTheme class="font-medium mb-2">
                        {{ post.theme }}
                    </PostTheme>
                    <p class="text-base text-[#006165] mb-3 leading-relaxed">{{ post.content }}</p>
                    <div class="text-xs text-gray-500 pt-2 border-t border-gray-100">{{
                        formatDate(post.created_at) }}</div>
                </li>
            </ul>
        </section>
    </section>
</template>
