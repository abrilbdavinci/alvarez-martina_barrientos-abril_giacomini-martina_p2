<script>
import { RouterLink } from 'vue-router';
import AppH1 from '../components/AppH1.vue';
import PostTheme from '../components/PostTheme.vue';
import { fetchPosts } from '../services/posts';
import { subscribeToAuthStateChanges } from '../services/auth';

let unsubscribeFromAuth = () => { };

export default {
    name: 'Publicaciones',
    components: { AppH1, PostTheme, RouterLink },
    data() {
        return {
            posts: [],
            currentUser: null,
        };
    },
    methods: {
        async loadPosts() {
            const allPosts = await fetchPosts();
            this.posts = allPosts;
            await this.$nextTick();
            // Scroll al último post
            if (this.$refs.postsContainer) {
                this.$refs.postsContainer.scrollTop = 0;
            }
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    },
    async mounted() {
        // Suscribirse a cambios de auth
        unsubscribeFromAuth = subscribeToAuthStateChanges(async user => {
            this.currentUser = user;
            // Cargar posts cuando cambia el usuario
            await this.loadPosts();
        });

        // Cargar posts al montar
        await this.loadPosts();
    },
    unmounted() {
        unsubscribeFromAuth();
    }
};
</script>

<template>
    <section class="w-full max-w-5xl mx-auto  py-10">
        <div class="flex justify-between items-center mb-6">
            <AppH1>Publicaciones</AppH1>
            <RouterLink v-if="currentUser" to="/crear-post"
                class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] transition-all duration-200">
                Crear publicación
            </RouterLink>
        </div>

        <div v-if="posts.length" ref="postsContainer" class="flex flex-col gap-6 w-full max-h-[500px] overflow-y-auto">
            <article v-for="post in posts" :key="post.id"
                class="p-5 rounded-[20px] border border-[#50B7C5] bg-white shadow-md w-full">

                <!-- Usuario -->

                <RouterLink :to="`/usuario/${post.sender_id}`"
                    class="hover:text-[#179BAE] transition-colors duration-200 font-semibold mb-2 block">
                    {{ post.user_email }}
                </RouterLink>


                <!-- Tema -->
                <PostTheme class="font-medium mb-2 block">
                    {{ post.theme }}
                </PostTheme>

                <!-- Contenido -->
                <p class="text-base text-[#1A1A1A] mb-3 leading-relaxed">
                    {{ post.content }}
                </p>

                <!-- Fecha -->
                <div class="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    {{ formatDate(post.created_at) }}
                </div>
            </article>
        </div>

        <div v-else class="text-center py-20 text-[#4B4B4B]">
            <p class="text-lg mb-2">Todavía no hay publicaciones</p>
        </div>
    </section>
</template>
