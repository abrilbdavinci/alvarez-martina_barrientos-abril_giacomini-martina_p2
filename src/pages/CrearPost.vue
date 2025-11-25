<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppH1 from '../components/AppH1.vue'
import { createPost, updatePost } from '../services/posts.js'
import { uploadFile, getFileURL, POSTS_BUCKET } from '../services/storage.js'
import { subscribeToAuthStateChanges } from '../services/auth.js'

const router = useRouter()
const currentUser = ref(null)

const postContent = ref('')
const postTheme = ref('skincare')
const imageFile1 = ref(null)
const imageFile2 = ref(null)
const imagePreview1 = ref(null)
const imagePreview2 = ref(null)
const loading = ref(false)

// Suscripción al estado de autenticación
subscribeToAuthStateChanges(user => {
  currentUser.value = user
})

// Manejo de selección de archivos
function onFileChange(e, index) {
  const file = e.target.files?.[0] ?? null
  if (!file) return

  if (index === 1) {
    if (imagePreview1.value) URL.revokeObjectURL(imagePreview1.value)
    imageFile1.value = file
    imagePreview1.value = URL.createObjectURL(file)
  } else {
    if (imagePreview2.value) URL.revokeObjectURL(imagePreview2.value)
    imageFile2.value = file
    imagePreview2.value = URL.createObjectURL(file)
  }
}

// Limpiar object URLs al desmontar
onUnmounted(() => {
  if (imagePreview1.value) URL.revokeObjectURL(imagePreview1.value)
  if (imagePreview2.value) URL.revokeObjectURL(imagePreview2.value)
})

// Subir imagen y retornar path/url
async function uploadImage(file, postId, index) {
  if (!file) return { path: null, url: null }
  const safeName = file.name.replace(/\s+/g, '_')
  const destPath = `${postId}/${Date.now()}_img${index}_${safeName}`
  const result = await uploadFile(destPath, file, POSTS_BUCKET)
  return {
    path: result.path,
    url: result.publicUrl ?? getFileURL(result.path, POSTS_BUCKET)
  }
}

// Crear post completo
async function handleSubmit() {
  if (!postContent.value.trim()) {
    alert('El contenido del post es obligatorio.')
    return
  }
  if (!currentUser.value?.id) {
    alert('Debés iniciar sesión para crear un post.')
    return
  }

  loading.value = true
  try {
    // Crear post sin imágenes primero
    const newPost = await createPost({
      sender_id: currentUser.value.id,
      user_email: currentUser.value.email,
      theme: postTheme.value,
      content: postContent.value
    })

    const postId = newPost.id

    // Subir imágenes
    const img1 = await uploadImage(imageFile1.value, postId, 1)
    const img2 = await uploadImage(imageFile2.value, postId, 2)

    // Actualizar post con URLs de imágenes
    await updatePost({
      id: postId,
      image_url_1: img1.url,
      image_path_1: img1.path,
      image_url_2: img2.url,
      image_path_2: img2.path
    })

    // Limpiar form
    postContent.value = ''
    postTheme.value = 'skincare'
    imageFile1.value = imageFile2.value = null
    imagePreview1.value = imagePreview2.value = null

    router.push('/publicaciones')
  } catch (err) {
    console.error('Crear post error:', err)
    alert('No se pudo crear el post.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center min-h-[80vh] max-w-full">
    <div class="w-6xl flex flex-col gap-6">
      <AppH1 class="text-center text-2xl text-[#006165]">Crear nuevo post</AppH1>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <label class="font-medium text-[#4B4B4B]">Tema</label>
        <select v-model="postTheme"
                class="w-full p-3 rounded-[20px] border border-gray-300 focus:ring-2 focus:ring-[#179BAE]">
          <option value="haircare">Haircare</option>
          <option value="skincare">Skincare</option>
        </select>

        <label class="font-medium text-[#4B4B4B]">Contenido</label>
        <textarea v-model="postContent"
                  rows="6"
                  class="w-full p-3 rounded-[20px] border border-gray-300 resize-none focus:ring-2 focus:ring-[#179BAE]"></textarea>

        <div class="flex gap-4">
          <div class="w-1/2 flex flex-col gap-1">
            <label class="font-medium text-[#4B4B4B]">Imagen</label>
            <input type="file" accept="image/*" @change="e => onFileChange(e, 1)" class="w-full"/>
            <img v-if="imagePreview1" :src="imagePreview1" class="h-32 object-cover rounded-md border mt-1"/>
          </div>

          <div class="w-1/2 flex flex-col gap-1">
            <label class="font-medium text-[#4B4B4B]">Imagen</label>
            <input type="file" accept="image/*" @change="e => onFileChange(e, 2)" class="w-full"/>
            <img v-if="imagePreview2" :src="imagePreview2" class="h-32 object-cover rounded-md border mt-1"/>
          </div>
        </div>

        <button type="submit" :disabled="loading"
                class="w-40 bg-[#179BAE] text-white px-6 py-2 rounded-[20px] mt-2">
          {{ loading ? 'Creando...' : 'Crear' }}
        </button>
      </form>
    </div>
  </div>
</template>
