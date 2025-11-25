<script setup>
/* -------------------------------------------------------
 * IMPORTS
 * ----------------------------------------------------- */
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import AppH1 from '../components/AppH1.vue'
import PostTheme from '../components/PostTheme.vue'

import useAuthUserState from '../composables/useAuthUserState.js'

// Posts
import {
    fetchPostById,
    updatePost,
    deletePost,
    subscribeToPostRealtime
} from '../services/posts.js'

// Comments
import {
    fetchCommentsByPostId,
    insertComment,
    updateComment,
    deleteComment,
    subscribeToCommentsRealtime
} from '../services/comments.js'

// Storage
import { uploadFile, getFileURL, POSTS_BUCKET } from '../services/storage.js'

/* -------------------------------------------------------
 * STATE
 * ----------------------------------------------------- */
const route = useRoute()
const router = useRouter()
const postId = route.params.id

const currentUser = useAuthUserState()
const post = ref(null)
const comments = ref([])

const loading = ref(false)
const saving = ref(false)

const newComment = ref('')

/* ------------------ POST EDIT ------------------ */
const editing = ref(false)
const editForm = reactive({
    content: '',
    theme: '',
    imageFile1: null,
    imagePreview1: null,
    imageFile2: null,
    imagePreview2: null,
})

/* ------------------ COMMENT EDIT ------------------ */
const editingCommentId = ref(null)
const editingCommentContent = ref('')

function isCommentOwner(c) {
    return currentUser.value?.id && c.author_id === currentUser.value.id
}

function startEditComment(c) {
    if (!isCommentOwner(c)) return
    editingCommentId.value = c.id
    editingCommentContent.value = c.content
}

function cancelEditComment() {
    editingCommentId.value = null
    editingCommentContent.value = ''
}

async function saveEditComment() {
    try {
        const updated = await updateComment(editingCommentId.value, {
            content: editingCommentContent.value
        })

        const idx = comments.value.findIndex(c => c.id === updated.id)
        if (idx !== -1) comments.value[idx] = updated

        cancelEditComment()
    } catch (err) {
        console.error('saveEditComment error:', err)
        alert('No se pudo editar el comentario.')
    }
}

async function removeComment(c) {
    if (!isCommentOwner(c)) return
    if (!confirm('¿Eliminar este comentario?')) return

    try {
        await deleteComment(c.id)
        comments.value = comments.value.filter(x => x.id !== c.id)
    } catch (err) {
        console.error('removeComment error:', err)
        alert('No se pudo eliminar.')
    }
}

/* -------------------------------------------------------
 * UTIL
 * ----------------------------------------------------- */
const isOwner = computed(() =>
    !!(currentUser.value && post.value && currentUser.value.id === post.value.sender_id)
)

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

/* -------------------------------------------------------
 * LOAD POST
 * ----------------------------------------------------- */
async function loadPost() {
    loading.value = true
    try {
        const p = await fetchPostById(postId)
        if (!p) { post.value = null; return }

        p.image_url_1 = p.image_path_1 ? await getFileURL(p.image_path_1, POSTS_BUCKET) : null
        p.image_url_2 = p.image_path_2 ? await getFileURL(p.image_path_2, POSTS_BUCKET) : null

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

/* -------------------------------------------------------
 * LOAD COMMENTS
 * ----------------------------------------------------- */
async function loadComments() {
    try {
        comments.value = await fetchCommentsByPostId(postId)
    } catch (err) {
        console.error('loadComments error:', err)
        comments.value = []
    }
}

/* -------------------------------------------------------
 * CREATE COMMENT
 * ----------------------------------------------------- */
async function submitComment() {
    if (!currentUser.value?.id) {
        alert('Tenés que iniciar sesión.')
        return
    }

    const content = newComment.value.trim()
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
        alert('No se pudo publicar.')
    }
}

/* -------------------------------------------------------
 * EDIT POST
 * ----------------------------------------------------- */
function onFileChange(e, index) {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    const fk = `imageFile${index}`
    const pk = `imagePreview${index}`

    if (editForm[pk]) URL.revokeObjectURL(editForm[pk])
    editForm[fk] = file
    editForm[pk] = URL.createObjectURL(file)
}

function startEdit() {
    editing.value = true
}

function cancelEdit() {
    editing.value = false
    editForm.content = post.value.content
    editForm.theme = post.value.theme

    if (editForm.imagePreview1) URL.revokeObjectURL(editForm.imagePreview1)
    if (editForm.imagePreview2) URL.revokeObjectURL(editForm.imagePreview2)

    editForm.imagePreview1 = editForm.imagePreview2 = null
    editForm.imageFile1 = editForm.imageFile2 = null
}

async function uploadImageAndGetPaths(file, index) {
    const key = `image_path_${index}`

    if (!file) {
        const existing = post.value?.[key]
        const existingURL = existing ? await getFileURL(existing, POSTS_BUCKET) : null
        return { path: existing, url: existingURL }
    }

    const safeName = (file.name || `img${index}`).replace(/\s+/g, '_')
    const dest = `${postId}/${Date.now()}_img${index}_${safeName}`

    const { path, publicUrl } = await uploadFile(dest, file, POSTS_BUCKET)

    return { path, url: publicUrl ?? await getFileURL(path, POSTS_BUCKET) }
}

async function saveEdit() {
    if (!isOwner.value) return

    saving.value = true
    try {
        const img1 = await uploadImageAndGetPaths(editForm.imageFile1, 1)
        const img2 = await uploadImageAndGetPaths(editForm.imageFile2, 2)

        await updatePost({
            id: postId,
            content: editForm.content,
            theme: editForm.theme,
            image_url_1: img1.url,
            image_path_1: img1.path,
            image_url_2: img2.url,
            image_path_2: img2.path
        })

        await loadPost()
        editing.value = false
    } catch (err) {
        console.error('saveEdit error:', err)
        alert('No se pudieron guardar los cambios.')
    } finally {
        saving.value = false
    }
}

/* -------------------------------------------------------
 * DELETE POST
 * ----------------------------------------------------- */
async function removePost() {
    if (!isOwner.value) return
    if (!confirm('¿Eliminar este post?')) return

    try {
        await deletePost(postId)
        router.push('/publicaciones')
    } catch (err) {
        console.error('removePost error:', err)
        alert('No se pudo eliminar.')
    }
}

/* -------------------------------------------------------
 * REALTIME
 * ----------------------------------------------------- */
let unsubPost = null
let unsubComments = null

onMounted(async () => {
    await loadPost()
    await loadComments()

    unsubPost = subscribeToPostRealtime(postId, async (evt) => {
        if (evt.eventType === 'UPDATE') await loadPost()
        if (evt.eventType === 'DELETE') {
            alert('El post fue eliminado.')
            router.push('/publicaciones')
        }
    })

    unsubComments = subscribeToCommentsRealtime(postId, (evt) => {
        if (evt.type === 'INSERT') comments.value.unshift(evt.newRow)
        if (evt.type === 'UPDATE') {
            const idx = comments.value.findIndex(c => c.id === evt.newRow.id)
            if (idx !== -1) comments.value[idx] = evt.newRow
        }
        if (evt.type === 'DELETE') {
            comments.value = comments.value.filter(c => c.id !== evt.oldRow.id)
        }
    })
})

onUnmounted(() => {
    if (editForm.imagePreview1) URL.revokeObjectURL(editForm.imagePreview1)
    if (editForm.imagePreview2) URL.revokeObjectURL(editForm.imagePreview2)
    unsubPost?.()
    unsubComments?.()
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

    <!-- POST -->
    <article v-else class="p-5 rounded-[20px] border border-[#50B7C5] bg-white shadow-md">

        <!-- Top -->
        <div class="flex w-full justify-between items-start mb-3">
            <div class="flex flex-col">
                <RouterLink
                    :to="`/usuario/${post.sender_id}`"
                    class="hover:text-[#179BAE] font-semibold mb-2">
                    {{ post.user_email }}
                </RouterLink>
                <PostTheme class="font-medium">{{ post.theme }}</PostTheme>
            </div>

            <div class="flex gap-2" v-if="isOwner && !editing">
                <button @click="startEdit" class="px-4 py-2 border rounded-[20px] border-[#179BAE] text-[#179BAE] hover:bg-[#E5F5F7]">
                    Editar
                </button>
                <button @click="removePost" class="px-4 py-2 border rounded-[20px] border-red-600 text-red-600 hover:bg-red-50">
                    Eliminar
                </button>
            </div>
        </div>

        <!-- VIEW MODE -->
        <div v-if="!editing">
            <p class="text-base text-[#1A1A1A] mb-3">{{ post.content }}</p>

            <div v-if="post.image_url_1 || post.image_url_2" class="flex gap-4 mb-3">
                <img v-if="post.image_url_1" :src="post.image_url_1"
                    class="rounded-md object-cover h-auto w-1/2">
                <img v-if="post.image_url_2" :src="post.image_url_2"
                    class="rounded-md object-cover h-auto w-1/2">
            </div>
        </div>

        <!-- EDIT MODE -->
        <div v-else>
            <label class="font-medium">Tema</label>
            <select v-model="editForm.theme" class="w-full p-3 border rounded-[20px] mb-3">
                <option value="haircare">Haircare</option>
                <option value="skincare">Skincare</option>
            </select>

            <label class="font-medium">Contenido</label>
            <textarea v-model="editForm.content" rows="5"
                class="w-full p-3 border rounded-[20px] mb-3"></textarea>

            <div class="flex gap-4">
                <div class="w-1/2">
                    <label class="font-medium">Imagen 1</label>
                    <input type="file" accept="image/*" @change="e => onFileChange(e, 1)" class="mb-2">
                    <img v-if="editForm.imagePreview1" :src="editForm.imagePreview1" class="h-32 w-full object-cover rounded-md border">
                    <img v-else-if="post.image_url_1" :src="post.image_url_1" class="h-32 w-full object-cover rounded-md border">
                </div>

                <div class="w-1/2">
                    <label class="font-medium">Imagen 2</label>
                    <input type="file" accept="image/*" @change="e => onFileChange(e, 2)" class="mb-2">
                    <img v-if="editForm.imagePreview2" :src="editForm.imagePreview2" class="h-32 w-full object-cover rounded-md border">
                    <img v-else-if="post.image_url_2" :src="post.image_url_2" class="h-32 w-full object-cover rounded-md border">
                </div>
            </div>

            <div class="flex gap-2 mt-4">
                <button @click="saveEdit" :disabled="saving"
                    class="bg-[#179BAE] text-white px-6 py-2 rounded-[20px] disabled:opacity-50">
                    {{ saving ? 'Guardando...' : 'Guardar' }}
                </button>
                <button @click="cancelEdit" class="px-6 py-2 border rounded-[20px]">
                    Cancelar
                </button>
            </div>
        </div>

        <div class="mt-3 text-xs text-gray-500 pt-2">
            {{ formatDate(post.created_at) }}
        </div>
    </article>

    <!-- COMMENTS -->
    <section class="mt-8 p-5 rounded-[20px] bg-gray-50 border shadow-sm">
        <h3 class="text-xl font-bold text-[#179BAE] mb-4">
            Comentarios ({{ comments.length }})
        </h3>

        <!-- Write -->
        <div v-if="currentUser?.id" class="mb-6">
            <textarea
                v-model="newComment"
                class="w-full p-3 border rounded-[20px] mb-2"
                placeholder="Escribí un comentario..."></textarea>

            <button @click="submitComment"
                class="bg-[#179BAE] text-white px-6 py-2 rounded-[20px]">
                Comentar
            </button>
        </div>

        <div v-else class="mb-4 text-sm text-gray-600 p-3 bg-white border rounded-lg">
            Iniciá sesión para comentar.
        </div>

        <!-- List -->
        <ul class="space-y-4">
            <li v-for="c in comments" :key="c.id"
                class="p-4 bg-white border rounded-[20px] shadow-sm">

                <div class="flex justify-between items-start">
                    <div class="font-semibold text-sm">{{ c.author_email }}</div>

                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500">
                            {{ formatDate(c.created_at) }}
                        </span>

                        <template v-if="isCommentOwner(c)">
                            <button @click="startEditComment(c)"
                                class="text-xs text-[#179BAE] hover:underline">
                                Editar
                            </button>
                            <button @click="removeComment(c)"
                                class="text-xs text-red-500 hover:underline">
                                Eliminar
                            </button>
                        </template>
                    </div>
                </div>

                <!-- Edit mode -->
                <div v-if="editingCommentId === c.id" class="mt-2">
                    <textarea v-model="editingCommentContent"
                        class="w-full p-2 border rounded-md text-sm"></textarea>

                    <div class="flex gap-2 mt-2">
                        <button @click="saveEditComment"
                            class="px-3 py-1 bg-[#179BAE] text-white rounded-md text-xs">
                            Guardar
                        </button>
                        <button @click="cancelEditComment"
                            class="px-3 py-1 bg-gray-200 rounded-md text-xs">
                            Cancelar
                        </button>
                    </div>
                </div>

                <!-- Normal -->
                <p v-else class="mt-1 text-base">
                    {{ c.content }}
                </p>
            </li>
        </ul>
    </section>

</section>
</template>
