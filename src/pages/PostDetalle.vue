<script setup>
/*
  PostDetalle.vue - versión final funcional (Corregida la carga de imágenes en Realtime)
*/

import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import AppH1 from '../components/AppH1.vue'
import PostTheme from '../components/PostTheme.vue'

import useAuthUserState from '../composables/useAuthUserState.js'
import {
    fetchPostById,
    updatePost,
    deletePost,
    subscribeToPostRealtime
} from '../services/posts.js'
import {
    fetchCommentsByPostId,
    insertComment,
    subscribeToCommentsRealtime
} from '../services/comments.js'
import { uploadFile, getFileURL, POSTS_BUCKET } from '../services/storage.js'

/* ---------- ROUTE / STATE ---------- */
const route = useRoute()
const router = useRouter()
const postId = route.params.id

const currentUser = useAuthUserState()
const post = ref(null)
const comments = ref([])
const loading = ref(false)
const saving = ref(false)
const newComment = ref('')

const editing = ref(false)
const editForm = reactive({
    content: '',
    theme: '',
    imageFile1: null,
    imagePreview1: null,
    imageFile2: null,
    imagePreview2: null,
})

const isOwner = computed(() => !!(currentUser.value && post.value && currentUser.value.id === post.value.sender_id))

/* ---------- FUNCIONES ---------- */
function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/* ---------- CARGA POST / COMENTARIOS ---------- */
async function loadPost() {
    loading.value = true
    try {
        const p = await fetchPostById(postId)
        if (!p) { post.value = null; return }

        // Resolver URLs públicas siempre, usando await
        // Esto asegura que las imágenes se muestren al cargar por primera vez y después de editar.
        p.image_url_1 = await getFileURL(p.image_path_1, POSTS_BUCKET) ?? null
        p.image_url_2 = await getFileURL(p.image_path_2, POSTS_BUCKET) ?? null

        post.value = p
        editForm.content = p.content
        editForm.theme = p.theme
    } catch (err) {
        console.error('loadPost error:', err)
        post.value = null
    } finally {
        loading.value = false
    }
}


async function loadComments() {
    try {
        comments.value = await fetchCommentsByPostId(postId)
    } catch (err) {
        console.error('loadComments error:', err)
        comments.value = []
    }
}

/* ---------- COMENTARIOS ---------- */
async function submitComment() {
    if (!currentUser.value?.id) {
        alert('Tenés que iniciar sesión para comentar.')
        return
    }
    const content = (newComment.value || '').trim()
    if (!content) return

    try {
        await insertComment({
            post_id: postId,
            content,
            author_id: currentUser.value.id,
            author_email: currentUser.value.email
        })
        newComment.value = ''
    } catch (err) {
        console.error('insertComment error:', err)
        alert('No se pudo publicar el comentario.')
    }
}

/* ---------- EDICIÓN / IMÁGENES ---------- */
function onFileChange(e, index) {
    const f = e.target.files?.[0] ?? null
    if (!f) return

    const previewKey = `imagePreview${index}`
    const fileKey = `imageFile${index}`

    if (editForm[previewKey]) URL.revokeObjectURL(editForm[previewKey])
    editForm[fileKey] = f
    editForm[previewKey] = URL.createObjectURL(f)
}

function startEdit() {
    if (!isOwner.value) return
    editing.value = true

    editForm.imageFile1 = null
    if (editForm.imagePreview1) URL.revokeObjectURL(editForm.imagePreview1)
    editForm.imagePreview1 = null

    editForm.imageFile2 = null
    if (editForm.imagePreview2) URL.revokeObjectURL(editForm.imagePreview2)
    editForm.imagePreview2 = null
}

function cancelEdit() {
    editing.value = false
    editForm.content = post.value?.content ?? ''
    editForm.theme = post.value?.theme ?? ''

    if (editForm.imagePreview1) URL.revokeObjectURL(editForm.imagePreview1)
    editForm.imagePreview1 = null
    editForm.imageFile1 = null

    if (editForm.imagePreview2) URL.revokeObjectURL(editForm.imagePreview2)
    editForm.imagePreview2 = null
    editForm.imageFile2 = null
}

async function uploadImageAndGetPaths(file, index) {
    if (!file) {
        return {
            path: post.value?.[`image_path_${index}`] ?? null,
            url: post.value?.[`image_url_${index}`] ?? null
        }
    }
    const safeName = (file.name || `img${index}`).replace(/\s+/g, '_')
    const destPath = `${postId}/${Date.now()}_img${index}_${safeName}`
    const { path, publicUrl } = await uploadFile(destPath, file, POSTS_BUCKET)
    return { path, url: publicUrl ?? await getFileURL(path, POSTS_BUCKET) }
}

async function saveEdit() {
    if (!isOwner.value) return
    saving.value = true
    try {
        const img1Data = await uploadImageAndGetPaths(editForm.imageFile1, 1)
        const img2Data = await uploadImageAndGetPaths(editForm.imageFile2, 2)

        await updatePost({
            id: postId,
            content: editForm.content,
            theme: editForm.theme,
            image_url_1: img1Data.url,
            image_path_1: img1Data.path,
            image_url_2: img2Data.url,
            image_path_2: img2Data.path
        })

        // Actualiza el estado local del post DESPUÉS de guardar
        post.value.content = editForm.content
        post.value.theme = editForm.theme
        post.value.image_url_1 = img1Data.url
        post.value.image_path_1 = img1Data.path
        post.value.image_url_2 = img2Data.url
        post.value.image_path_2 = img2Data.path

        editing.value = false
    } catch (err) {
        console.error('saveEdit error:', err)
        alert('No se pudieron guardar los cambios.')
    } finally {
        saving.value = false
    }
}

/* ---------- ELIMINAR ---------- */
async function removePost() {
    if (!isOwner.value) return
    if (!confirm('¿Eliminar este post? Esta acción es permanente.')) return
    try {
        await deletePost(postId)
        router.push('/publicaciones')
    } catch (err) {
        console.error('removePost error:', err)
        alert('No se pudo eliminar el post.')
    }
}

/* ---------- REALTIME (Corregido) ---------- */
let unsubPost = null
let unsubComments = null

onMounted(async () => {
    await loadPost()
    await loadComments()

    // 💡 SOLUCIÓN: Al recibir una actualización, recargamos el post completo 
    // de forma asíncrona para asegurar que las URLs públicas sean resueltas
    unsubPost = subscribeToPostRealtime(postId, async (evt) => { 
        if (!evt) return
        if (evt.eventType === 'UPDATE') {
            await loadPost() // <-- Llama a la función robusta que resuelve las URLs
        } else if (evt.eventType === 'DELETE') {
            alert('El post fue eliminado.')
            router.push('/publicaciones')
        }
    })

    unsubComments = subscribeToCommentsRealtime(postId, (evt) => {
        if (!evt) return
        if (evt.type === 'INSERT') comments.value.unshift(evt.newRow)
        else if (evt.type === 'UPDATE') {
            const idx = comments.value.findIndex(c => c.id === evt.newRow.id)
            if (idx !== -1) comments.value[idx] = evt.newRow
        } else if (evt.type === 'DELETE') {
            comments.value = comments.value.filter(c => c.id !== evt.oldRow.id)
        }
    })
})

onUnmounted(() => {
    if (editForm.imagePreview1) URL.revokeObjectURL(editForm.imagePreview1)
    if (editForm.imagePreview2) URL.revokeObjectURL(editForm.imagePreview2)
    if (typeof unsubPost === 'function') unsubPost()
    if (typeof unsubComments === 'function') unsubComments()
})
</script>

<template>
<section class="w-full max-w-5xl mx-auto py-10">

    <div class="flex justify-between items-center mb-6">
        <AppH1 v-if="post">Publicación de {{ post.user_email }}</AppH1>
        <AppH1 v-else>Publicación</AppH1>
    </div>

    <div v-if="loading" class="py-8 text-center text-gray-500">Cargando...</div>
    <div v-else-if="!post" class="py-8 text-center text-gray-500">No se encontró la publicación.</div>

    <article v-else class="p-5 rounded-[20px] border border-[#50B7C5] bg-white shadow-md w-full">

        <RouterLink :to="`/usuario/${post.sender_id}`"
            class="hover:text-[#179BAE] transition-colors duration-200 font-semibold mb-2 block">
            {{ post.user_email }}
        </RouterLink>

        <PostTheme class="font-medium mb-2 block">{{ post.theme }}</PostTheme>

        <div v-if="!editing">
            <p class="text-base text-[#1A1A1A] mb-3 leading-relaxed">{{ post.content }}</p>

            <div v-if="post.image_url_1 || post.image_url_2" class="flex gap-4 mb-3">
                <img v-if="post.image_url_1" :src="post.image_url_1"
                    :class="['h-64 object-cover rounded-md', post.image_url_2 ? 'w-1/2' : 'w-full']" />
                <img v-if="post.image_url_2" :src="post.image_url_2"
                    :class="['h-64 object-cover rounded-md', post.image_url_1 ? 'w-1/2' : 'w-full']" />
            </div>
        </div>

        <div v-else>
            <label class="block mb-1 font-medium text-[#4B4B4B]">Tema</label>
            <select v-model="editForm.theme"
                class="w-full p-3 rounded-[20px] text-[#1A1A1A] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#179BAE] mb-3">
                <option value="haircare">Haircare</option>
                <option value="skincare">Skincare</option>
            </select>

            <label class="block mb-1 font-medium text-[#4B4B4B]">Contenido</label>
            <textarea v-model="editForm.content"
                class="w-full mb-3 p-3 border rounded-[20px] text-[#1A1A1A] resize-none focus:outline-none focus:ring-2 focus:ring-[#179BAE]"
                rows="5"></textarea>

            <div class="flex gap-4 mb-3">
                <div class="w-1/2">
                    <label class="block mb-1 font-medium text-[#4B4B4B]">Imagen 1 (opcional)</label>
                    <input type="file" @change="e => onFileChange(e, 1)" accept="image/*" class="mb-2 text-sm" />
                    <img v-if="editForm.imagePreview1" :src="editForm.imagePreview1"
                        class="max-w-full h-32 object-cover rounded-md mb-2 border" />
                    <img v-else-if="post.image_url_1" :src="post.image_url_1"
                        class="max-w-full h-32 object-cover rounded-md mb-2 border border-gray-300" />
                </div>
                <div class="w-1/2">
                    <label class="block mb-1 font-medium text-[#4B4B4B]">Imagen 2 (opcional)</label>
                    <input type="file" @change="e => onFileChange(e, 2)" accept="image/*" class="mb-2 text-sm" />
                    <img v-if="editForm.imagePreview2" :src="editForm.imagePreview2"
                        class="max-w-full h-32 object-cover rounded-md mb-2 border" />
                    <img v-else-if="post.image_url_2" :src="post.image_url_2"
                        class="max-w-full h-32 object-cover rounded-md mb-2 border border-gray-300" />
                </div>
            </div>

            <div class="flex gap-2 mt-4">
                <button @click="saveEdit" :disabled="saving"
                        class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] transition-colors duration-200 disabled:opacity-50 hover:bg-[#137e8c]">
                    {{ saving ? 'Guardando...' : 'Guardar' }}
                </button>
                <button @click="cancelEdit"
                        class="px-6 py-2 rounded-[20px] border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
                    Cancelar
                </button>
            </div>
        </div>

        <div class="mt-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
            Creado: {{ formatDate(post.created_at) }}
        </div>

        <div class="mt-4 flex gap-2" v-if="isOwner && !editing">
            <button @click="startEdit"
                    class="px-4 py-2 rounded-[20px] border border-[#179BAE] text-[#179BAE] hover:bg-[#E5F5F7] transition-colors">
                Editar
            </button>
            <button @click="removePost"
                    class="px-4 py-2 rounded-[20px] border border-red-600 text-red-600 hover:bg-red-50 transition-colors">
                Eliminar
            </button>
        </div>
    </article>

    <section class="mt-8 p-5 rounded-[20px] bg-gray-50 border border-gray-200 shadow-sm">
        <h3 class="text-xl font-bold text-[#179BAE] mb-4">Comentarios ({{ comments.length }})</h3>

        <div v-if="currentUser?.id" class="mb-6">
            <textarea v-model="newComment" placeholder="Escribí un comentario..."
                      class="w-full p-3 border border-gray-300 rounded-[20px] mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#179BAE]"></textarea>
            <button @click="submitComment"
                    class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] hover:bg-[#137e8c] transition-colors duration-200">
                Comentar
            </button>
        </div>
        <div v-else class="mb-4 text-sm text-gray-600 p-3 bg-white rounded-lg border">
            Iniciar sesión para comentar.
        </div>

        <ul class="space-y-4">
            <li v-for="c in comments" :key="c.id" class="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div class="flex justify-between items-start">
                    <div class="text-sm font-semibold text-[#1A1A1A]">{{ c.author_email ?? c.author_id }}</div>
                    <div class="text-xs text-gray-500">{{ formatDate(c.created_at) }}</div>
                </div>
                <div class="text-base mt-1 leading-relaxed">{{ c.content }}</div>
            </li>
        </ul>
    </section>
</section>
</template>