<script setup>
/**
 * MiPerfilEditarAvatar.vue
 * - No depende de uploadAuthUserPhoto en auth.js.
 * - Usa uploadFile() y getFileURL() desde services/storage.js
 * - Luego llama updateAuthUser({ photo_path, photo_url }) para persistir en user_profiles.
 *
 * Requisitos:
 * - services/storage.js exporte: uploadFile(path, file, bucket = 'avatars', options = {}) y getFileURL(path, bucket = 'avatars')
 * - services/auth.js exporte: updateAuthUser(data)
 * - composable useAuthUserState() disponible (opcional; se usa aquí para obtener user.id)
 */

import { ref, onUnmounted } from 'vue'
import AppH1 from '../components/AppH1.vue'
import AppLoader from '../components/AppLoader.vue'
import useAuthUserState from '../composables/useAuthUserState.js'
import { updateAuthUser } from '../services/auth.js'
import { uploadFile, getFileURL } from '../services/storage.js' // Asegurate que exporten estos nombres

const user = useAuthUserState() // ref con el objeto user (puede ser null si no logueado)

// Estado local
const imageData = ref({
  file: null,
  preview: null,       // objectURL para preview local
  existingUrl: null,   // URL pública existente (si la hay)
})

const loading = ref(false)
const feedback = ref({ message: null, type: 'success' })

// Inicializar existingUrl si el user ya tiene photo_path/photo_url
if (user.value) {
  if (user.value.photo_url) {
    imageData.value.existingUrl = user.value.photo_url
  } else if (user.value.photo_path) {
    imageData.value.existingUrl = getFileURL(user.value.photo_path)
  }
}

// Manejar cambio de input file
function handleImageChange(event) {
  if (loading.value) return

  const file = event.target.files?.[0] ?? null

  // liberar preview anterior
  if (imageData.value.preview) {
    URL.revokeObjectURL(imageData.value.preview)
    imageData.value.preview = null
  }

  imageData.value.file = file

  if (!file) return

  imageData.value.preview = URL.createObjectURL(file)
}

// limpiar objectURL al desmontar para evitar memory leaks
onUnmounted(() => {
  if (imageData.value.preview) {
    URL.revokeObjectURL(imageData.value.preview)
    imageData.value.preview = null
  }
})

/**
 * uploadAvatar
 * - crea un path seguro: avatars/{userId}/{timestamp}_{filename}
 * - llama uploadFile(path, file, bucket)
 * - obtiene publicUrl (si bucket público) con getFileURL()
 * - actualiza user_profiles via updateAuthUser({ photo_path, photo_url })
 */
async function uploadAvatar() {
  if (!imageData.value.file) {
    feedback.value = { message: 'No seleccionaste ninguna imagen.', type: 'error' }
    return
  }

  const uid = user.value?.id
  if (!uid) {
    feedback.value = { message: 'No estás autenticado.', type: 'error' }
    return
  }

  loading.value = true
  feedback.value = { message: null, type: 'success' }

  try {
    const file = imageData.value.file
    const safeName = (file.name || 'avatar').replace(/\s+/g, '_')
    const path = `avatars/${uid}/${Date.now()}_${safeName}`
    const bucket = 'avatars' // ajustá si tu bucket tiene otro nombre

    // 1) Subir archivo
    // uploadFile debería retornar algo útil; según la versión que uses,
    // puede devolver { path, publicUrl } o la respuesta cruda de supabase.
    const uploadResult = await uploadFile(path, file, bucket)

    // 2) Determinar path y publicUrl de forma robusta
    let uploadedPath = null
    let publicUrl = null

    // - Si uploadFile siguió la convención que recomendé, devuelve { path, publicUrl }
    if (uploadResult && uploadResult.path) {
      uploadedPath = uploadResult.path
      publicUrl = uploadResult.publicUrl ?? getFileURL(uploadedPath, bucket)
    } else if (uploadResult && uploadResult.data && uploadResult.data.path) {
      // si devolvió la estructura de supabase: { data: { path: '...'} }
      uploadedPath = uploadResult.data.path
      publicUrl = getFileURL(uploadedPath, bucket)
    } else {
      // fallback: usamos el path que construimos
      uploadedPath = path
      publicUrl = getFileURL(uploadedPath, bucket)
    }

    // 3) Actualizar user_profiles con photo_path / photo_url
    const payload = {}
    if (uploadedPath) payload.photo_path = uploadedPath
    if (publicUrl) payload.photo_url = publicUrl

    if (Object.keys(payload).length > 0) {
      await updateAuthUser(payload)
    }

    // 4) actualizar la UI local
    imageData.value.existingUrl = publicUrl ?? imageData.value.existingUrl
    if (imageData.value.preview) {
      // revocar preview y limpiar (opcional)
      URL.revokeObjectURL(imageData.value.preview)
      imageData.value.preview = null
    }
    imageData.value.file = null

    feedback.value = { message: 'Foto subida y perfil actualizado.', type: 'success' }
  } catch (err) {
    console.error('[MiPerfilEditarAvatar] upload error:', err)
    feedback.value = { message: err?.message ?? 'Error al subir la imagen', type: 'error' }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="w-full max-w-3xl mx-auto py-8">
    <AppH1>Editar mi foto de perfil</AppH1>

    <div v-if="feedback.message" class="my-4 p-3 rounded"
         :class="{
           'bg-green-100 text-green-800': feedback.type === 'success',
           'bg-red-100 text-red-800': feedback.type === 'error'
         }">
      {{ feedback.message }}
    </div>

    <div class="flex gap-6 items-start">
      <div>
        <div class="mb-4">
          <img v-if="imageData.preview" :src="imageData.preview" alt="preview"
               class="w-40 h-40 object-cover rounded-full border" />
          <img v-else-if="imageData.existingUrl" :src="imageData.existingUrl" alt="current"
               class="w-40 h-40 object-cover rounded-full border" />
          <div v-else class="w-40 h-40 flex items-center justify-center rounded-full border text-gray-500">
            Sin foto
          </div>
        </div>

        <div class="mb-3">
          <label for="image" class="block mb-1 font-semibold text-[#006165]">Seleccionar foto</label>
          <input id="image" type="file" accept="image/*" @change="handleImageChange"
                 :disabled="loading" class="w-full p-2 border rounded" />
        </div>

        <div>
          <button class="px-4 py-2 rounded bg-[#179BAE] text-white" :disabled="loading"
                  @click="uploadAvatar">
            <template v-if="!loading">Subir y actualizar</template>
            <template v-else><AppLoader /></template>
          </button>
        </div>
      </div>

      <div class="flex-1 text-sm text-gray-600">
        <p class="mb-2">Formato recomendado: JPG/PNG. Tamaño cuadrado ideal.</p>
        <p class="mb-2">La imagen se sube al bucket <code>avatars</code> y se guarda la ruta en tu perfil.</p>
        <p class="text-xs text-gray-400">Si el bucket es privado, getFileURL puede devolver null; en ese caso usa signed URLs desde storage.js.</p>
      </div>
    </div>
  </section>
</template>
