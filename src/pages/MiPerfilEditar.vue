<script setup>
/**
 * MiPerfilEditar.vue (Composition API)
 * - NO modifica auth.js (lo respeta tal como lo tenés).
 * - Usa storage.uploadFile + storage.getFileURL para subir imagenes.
 * - Luego llama updateAuthUser({ photo_path, photo_url, ... }) para persistir los datos.
 *
 * Requisitos:
 * - services/storage.js exporte: uploadFile(path, file, bucket, options) y getFileURL(path, bucket)
 *   (la versión recomendada devuelve { path, publicUrl } o al menos getFileURL puede generar la URL)
 * - services/auth.js exporte: updateAuthUser(data) y subscribeToAuthStateChanges OR composable useAuthUserState
 * - user_profiles debe tener columnas photo_path y/o photo_url (si no las tenés, añadilas).
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppH1 from '../components/AppH1.vue'
import AppLoader from '../components/AppLoader.vue'

import useAuthUserState from '../composables/useAuthUserState.js'
import { updateAuthUser } from '../services/auth.js'
import { uploadFile, getFileURL } from '../services/storage.js' // ajustar si tus nombres son distintos

const router = useRouter()
const user = useAuthUserState() // composable que devuelve ref(userObject)

/* ---------- Form state ---------- */
const formData = ref({
  display_name: null,
  bio: null,
  goal: null,
})

const loading = ref(false)
const feedback = ref({ message: null, type: 'success' })

/* ---------- Image state ---------- */
const imageData = ref({
  file: null,      // File | null
  preview: null,   // objectURL for preview
  existingUrl: null // url from user.photo_url or from storage.getFileURL(user.photo_path)
})

/* Sync initial values from user composable */
function syncFromUser(u) {
  if (!u) return
  formData.value.display_name = u.display_name ?? null
  formData.value.bio = u.bio ?? null
  formData.value.goal = u.goal ?? null

  // photo_url has priority
  if (u.photo_url) {
    imageData.value.existingUrl = u.photo_url
  } else if (u.photo_path) {
    // try to build a public url from the path (works if bucket is public or if getFileURL does signed url)
    imageData.value.existingUrl = getFileURL(u.photo_path) ?? null
  } else {
    imageData.value.existingUrl = null
  }
}

onMounted(() => {
  syncFromUser(user.value)
})

watch(user, (u) => {
  syncFromUser(u)
}, { immediate: true })

/* ---------- Image handlers ---------- */
function handleImageChange(e) {
  if (loading.value) return
  const file = e.target.files?.[0] ?? null

  // revoke previous preview if any
  if (imageData.value.preview) {
    URL.revokeObjectURL(imageData.value.preview)
    imageData.value.preview = null
  }

  imageData.value.file = file

  if (!file) return

  // create object url for preview
  imageData.value.preview = URL.createObjectURL(file)
}

onUnmounted(() => {
  if (imageData.value.preview) {
    URL.revokeObjectURL(imageData.value.preview)
    imageData.value.preview = null
  }
})

/* ---------- Upload helper (uses storage.uploadFile) ---------- */
async function uploadAvatarFile(file) {
  // prepare a safe filename/path: avatars/{userId}/{timestamp}_{name}
  const uid = user.value?.id
  if (!uid) throw new Error('No hay usuario autenticado para subir la imagen')

  const safeName = (file.name || 'avatar').replace(/\s+/g, '_')
  const path = `avatars/${uid}/${Date.now()}_${safeName}`

  // uploadFile debe devolver información util. Algunas implementaciones retornan { path, publicUrl }
  // pero si la tuya devuelve otra cosa, adaptá el retorno.
  const result = await uploadFile(path, file, 'avatars') // bucket 'avatars' por defecto
  // result podría ser { path: '...', publicUrl: '...' } o bien supabase response. Manejo flexible abajo.

  // If uploadFile returns the raw data object (supabase response), try to extract path:
  // - If your uploadFile follows the version recommended, it returns { path, publicUrl }
  // - Si no, intenta asumir que `result.path` existe o que `result.data.path` existe.
  let uploadedPath = null
  let publicUrl = null

  if (!result) {
    // uploadFile returned nothing -> try to build path from our `path` variable
    uploadedPath = path
    publicUrl = getFileURL(uploadedPath) // may be null for private buckets
  } else if (result.path) {
    uploadedPath = result.path
    publicUrl = result.publicUrl ?? getFileURL(result.path)
  } else if (result.data && result.data.path) {
    uploadedPath = result.data.path
    publicUrl = result.publicUrl ?? getFileURL(uploadedPath)
  } else {
    // fallback: assume we uploaded to `path`
    uploadedPath = path
    publicUrl = getFileURL(uploadedPath)
  }

  return { path: uploadedPath, publicUrl }
}

/* ---------- Submit ---------- */
async function handleSubmit() {
  try {
    feedback.value = { message: null, type: 'success' }
    loading.value = true

    // 1) Si hay imagen nueva, subirla primero
    let uploadResult = null
    if (imageData.value.file) {
      uploadResult = await uploadAvatarFile(imageData.value.file)
    }

    // 2) Preparar payload para updateAuthUser (actualiza user_profiles)
    const payload = {
      display_name: formData.value.display_name,
      bio: formData.value.bio,
      goal: formData.value.goal,
    }

    if (uploadResult?.path) payload.photo_path = uploadResult.path
    if (uploadResult?.publicUrl) payload.photo_url = uploadResult.publicUrl

    // 3) Llamar a updateAuthUser (tu auth.js exporta esta función)
    await updateAuthUser(payload)

    feedback.value = { message: 'Perfil actualizado correctamente.', type: 'success' }

    // redirect to profile page (optional)
    router.push('/mi-perfil')
  } catch (err) {
    console.error('[MiPerfilEditar] error:', err)
    feedback.value = { message: err?.message ?? 'Ocurrió un error al actualizar perfil', type: 'error' }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="w-full mx-auto py-10">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6">
      <AppH1 class="text-3xl font-bold text-[#006165] mb-2 sm:mb-0">Editar mi perfil</AppH1>
    </div>

    <div v-if="feedback.message" class="mb-4 p-3 rounded"
         :class="{
           'bg-green-100 text-green-800': feedback.type === 'success',
           'bg-red-100 text-red-800': feedback.type === 'error'
         }">
      {{ feedback.message }}
    </div>

    <form @submit.prevent="handleSubmit" class="mb-10 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2">
        <div class="mb-3">
          <label for="display_name" class="block mb-1 font-semibold text-[#006165]">Usuario</label>
          <input id="display_name" type="text" v-model="formData.display_name"
                 class="w-full p-2 border border-gray-400 rounded-[100px] focus:ring-2 focus:ring-[#179BAE] outline-none" />
        </div>

        <div class="mb-3">
          <label for="bio" class="block mb-1 font-semibold text-[#006165]">Biografía</label>
          <textarea id="bio" v-model="formData.bio" rows="4"
                    class="w-full p-2 border border-gray-400 rounded-[20px] focus:ring-2 focus:ring-[#179BAE] outline-none"></textarea>
        </div>

        <div class="mb-3">
          <label for="goal" class="block mb-1 font-semibold text-[#006165]">Objetivo</label>
          <input id="goal" type="text" v-model="formData.goal"
                 class="w-full p-2 border border-gray-400 rounded-[100px] focus:ring-2 focus:ring-[#179BAE] outline-none" />
        </div>

        <div class="mt-4">
          <button type="submit" :disabled="loading"
                  class="bg-[#179BAE] text-white font-medium px-6 py-2 rounded-[20px] transition-all duration-200 hover:bg-[#0f7d8d] disabled:opacity-50">
            <template v-if="!loading">Actualizar perfil</template>
            <template v-else><AppLoader /></template>
          </button>
        </div>
      </div>

      <div class="md:col-span-1">
        <label class="block mb-2 font-semibold text-[#006165]">Foto de perfil</label>

        <div class="mb-4">
          <img v-if="imageData.existingUrl && !imageData.preview" :src="imageData.existingUrl"
               alt="Foto actual" class="w-40 h-40 object-cover rounded-full border" />
          <div v-else-if="imageData.preview" class="w-40 h-40 overflow-hidden rounded-full border">
            <img :src="imageData.preview" alt="Preview" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-40 h-40 flex items-center justify-center rounded-full border text-gray-500">
            Sin foto
          </div>
        </div>

        <div class="mb-3">
          <label for="image" class="block mb-1">Seleccionar nueva foto</label>
          <input id="image" type="file" accept="image/*"
                 class="w-full p-2 border border-gray-300 rounded"
                 :disabled="loading"
                 @change="handleImageChange" />
        </div>
        <p class="text-xs text-gray-500">Formatos: JPG, PNG. Tamaño recomendado: cuadrado.</p>
      </div>
    </form>
  </section>
</template>
