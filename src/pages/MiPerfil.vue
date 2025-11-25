<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import AppH1 from '../components/AppH1.vue'
import PostTheme from '../components/PostTheme.vue'

import useAuthUserState from '../composables/useAuthUserState.js'
import { getFileURL } from '../services/storage.js'
import { fetchPosts } from '../services/posts.js'
import { fetchUserProfileById } from '../services/user-profiles.js'

const user = useAuthUserState() // ref con el user actual
const posts = ref([])
const loading = ref(false)

async function loadUserProfile(userId) {
    if (!userId) return
    loading.value = true
    try {
        const profile = await fetchUserProfileById(userId)
        if (profile) {
            // si tu composable no actualiza automáticamente, podés manejar local
            // Pero aquí confiamos en que useAuthUserState ya sincroniza
        }
        await loadUserPosts(profile?.email ?? user.value?.email)
    } catch (err) {
        console.error('loadUserProfile error:', err)
    } finally {
        loading.value = false
    }
}

async function loadUserPosts(email) {
    if (!email) {
        posts.value = []
        return
    }

    try {
        const all = await fetchPosts()
        posts.value = all.filter(p => p.user_email === email)
    } catch (err) {
        console.error('loadUserPosts error:', err)
        posts.value = []
    }
}

function formatDate(dateString) {
    if (!dateString) return ''
    const d = new Date(dateString)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* cuando cambia el user, recargamos perfil */
watch(user, (u) => {
    if (!u || !u.id) {
        posts.value = []
        return
    }
    // preferimos email del perfil si está en user (useAuthUserState debería traerlo)
    loadUserProfile(u.id)
}, { immediate: true })
</script>

<template>

    <section class="w-full mx-auto">
        <!-- Foto de perfil -->
        <div
            class="w-34 h-34 rounded-full overflow-hidden mb-6 border-2 border-gray-300 flex items-center justify-center">
            <img v-if="user.photo_url" :src="getFileURL(user.photo_url)" alt="Foto de perfil"
                class="w-full h-full object-cover" />
            <span v-else class="text-gray-500 text-sm text-center">Sin foto de perfil</span>
        </div>

        <!-- Título y botón editar -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">


            <AppH1 class="text-3xl font-bold text-[#006165] mb-2 sm:mb-0">Mi perfil</AppH1>
            <RouterLink to="/mi-perfil/editar"
                class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[100px] transition-all duration-200">Editar
                perfil</RouterLink>
        </div>
        <section class="mb-10 p-6">
            <div class="flex gap-4">

                <div class="w-3/4">
                    <div class="ms-4 mb-8 italic text-gray-800">{{ user.bio || 'Sin especificar...' }}</div>

                    <dl>
                        <dt class="mb-1 font-bold">Email</dt>
                        <dd class="mb-2">{{ user.email }}</dd>
                        <dt class="mb-1 font-bold">Usuario</dt>
                        <dd class="mb-2">{{ user.display_name || 'Sin especificar...' }}</dd>
                        <dt class="mb-1 font-bold">Objetivo</dt>
                        <dd class="mb-2">{{ user.goal || 'Sin especificar...' }}</dd>
                    </dl>
                </div>
            </div>
        </section>



        <section class="mt-8">
            <h2 class="text-xl font-bold text-[#006165] mb-6 border-b border-[#50B7C5] pb-2">Mis publicaciones</h2>

            <ul v-if="posts.length" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto">
                <li v-for="post in posts" :key="post.id"
                    class="p-5 rounded-[20px] shadow-md border border-[#50B7C5] bg-white hover:shadow-lg transition duration-300">
                    <PostTheme class="font-medium mb-2">{{ post.theme }}</PostTheme>
                    <p class="text-base text-[#006165] mb-3 leading-relaxed">{{ post.content }}</p>

                    <div v-if="post.image_url_1 || post.image_url_2" class="flex gap-2">
                        <img v-if="post.image_url_1" :src="post.image_url_1"
                            :class="post.image_url_2 ? 'w-1/2' : 'w-full'" class="h-auto object-cover rounded-md" />
                        <img v-if="post.image_url_2" :src="post.image_url_2"
                            :class="post.image_url_1 ? 'w-1/2' : 'w-full'" class="h-auto object-cover rounded-md" />
                    </div>
                </li>

            </ul>

            <div v-else class="text-center py-8 text-gray-500">Sin publicaciones aún.</div>
        </section>
    </section>
</template>
