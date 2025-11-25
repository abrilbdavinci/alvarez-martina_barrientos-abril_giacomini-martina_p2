// src/services/storage.js
import { supabase } from './supabase.js'

/**
 * Storage helper robusto para evitar:
 *  - pasar path que incluya el bucket (evita posts)
 *  - manejar publicUrl y signed urls
 *  - metadata útil para policies
 */

const DEFAULT_BUCKET = 'avatars'      // por defecto
const POSTS_BUCKET = 'post-images'    // ajustá si tu bucket tiene otro nombre

// -------------------- util --------------------
/**
 * Si path viene con el prefijo del bucket (ej "post-images/xxx"), lo elimina.
 * Esto previene la duplicación bucket/bucket en la URL.
 */
function normalizePath(path = '', bucket = '') {
  if (!path) return path
  if (!bucket) return path
  const prefix = `${bucket.replace(/\/+$/,'')}/`
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length)
  }
  return path
}

/**
 * Normaliza folder para que no tenga barras dobles y termine sin slash
 */
function normalizeFolder(folder = '') {
  if (!folder) return ''
  return folder.replace(/^\/+|\/+$/g, '')
}

// -------------------- core upload --------------------
/**
 * uploadFile(path, file, bucket, options)
 * - path: ruta dentro del bucket (NO incluir el bucket al inicio)
 * - devuelve: { path, publicUrl }
 */
export async function uploadFile(path, file, bucket = DEFAULT_BUCKET, options = {}) {
  if (!path || !file) throw new Error('uploadFile: path y file son requeridos')

  // evitar prefijo redundante
  const safePath = normalizePath(path, bucket)

  const { cacheControl = '3600', upsert = false, metadata = {} } = options

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(safePath, file, { cacheControl, upsert, metadata })

    if (error) {
      console.error('[storage.js uploadFile] Error al subir archivo:', error)
      throw error
    }

    // intentar obtener publicUrl (si bucket es público)
    const { data: publicData, error: publicErr } = await supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    const publicUrl = publicErr ? null : publicData?.publicUrl ?? null

    return { path: data.path, publicUrl }
  } catch (err) {
    console.error('[storage.js uploadFile] Error al subir archivo:', err)
    throw err
  }
}

// -------------------- avatars --------------------
export async function uploadUserAvatar(file, userId, bucket = DEFAULT_BUCKET) {
  if (!file) throw new Error('uploadUserAvatar: file es requerido')
  if (!userId) throw new Error('uploadUserAvatar: userId es requerido')

  const safeName = (file.name || 'avatar').replace(/\s+/g, '_')
  const path = `avatars/${userId}/${Date.now()}_${safeName}`
  const metadata = { owner_id: userId }
  return await uploadFile(path, file, bucket, { metadata })
}

// -------------------- generic image upload --------------------
/**
 * uploadImageToStorage(file, opts)
 * opts: { bucket, userId, folder, metadata, upsert }
 * - Si bucket === POSTS_BUCKET por defecto folder 'post-files'
 * - Retorna { path, publicUrl }
 */
export async function uploadImageToStorage(file, opts = {}) {
  if (!file) throw new Error('uploadImageToStorage: file es requerido')

  const bucket = opts.bucket ?? DEFAULT_BUCKET

  // si piden avatar y bucket default
  if (opts.userId && bucket === DEFAULT_BUCKET) {
    return await uploadUserAvatar(file, opts.userId, bucket)
  }

  const safeName = (file.name || 'file').replace(/\s+/g, '_')
  const baseFolder = opts.folder ?? (bucket === POSTS_BUCKET ? 'post-files' : 'uploads')
  const folder = normalizeFolder(baseFolder)
  const userPrefix = opts.userId ? `${opts.userId}/` : ''
  // path DENTRO del bucket: ej "post-files/34/1632_img.jpg"
  const path = `${folder}/${userPrefix}${Date.now()}_${safeName}`.replace(/\/+/g, '/').replace(/^\//, '')

  return await uploadFile(path, file, bucket, { metadata: opts.metadata ?? {}, upsert: !!opts.upsert })
}

// -------------------- delete --------------------
export async function deleteFile(paths, bucket = DEFAULT_BUCKET) {
  const arr = Array.isArray(paths) ? paths : [paths]
  // No asumimos que paths vienen con prefijo. No hacemos normalizePath aquí porque supabase espera el path tal cual.
  const normalized = arr.map(p => normalizePath(p, bucket))
  const { data, error } = await supabase.storage.from(bucket).remove(normalized)
  if (error) {
    console.error('[storage.js deleteFile] Error al eliminar archivo(s):', error)
    throw error
  }
  return data
}

// -------------------- get urls --------------------
export function getFileURL(pathOrUrl, bucket = DEFAULT_BUCKET) {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  try {
    const { data, error } = supabase.storage.from(bucket).getPublicUrl(normalizePath(pathOrUrl, bucket))
    if (error) {
      console.warn('[storage.js getFileURL] warning:', error)
      return null
    }
    return data?.publicUrl ?? null
  } catch (err) {
    console.error('[storage.js getFileURL] error:', err)
    return null
  }
}

export async function getSignedUrl(path, expiresSeconds = 60 * 60, bucket = DEFAULT_BUCKET) {
  if (!path) throw new Error('getSignedUrl: path requerido')
  const safePath = normalizePath(path, bucket)
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(safePath, expiresSeconds)
  if (error) {
    console.error('[storage.js getSignedUrl] Error:', error)
    throw error
  }
  return data.signedUrl
}

// exportar constantes útiles
export { POSTS_BUCKET, DEFAULT_BUCKET }
