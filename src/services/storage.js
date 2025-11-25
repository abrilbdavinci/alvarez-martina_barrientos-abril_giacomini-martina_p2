// src/services/storage.js
import { supabase } from './supabase.js'

// Buckets disponibles
export const DEFAULT_BUCKET = 'avatars'
export const POSTS_BUCKET = 'post-images'

/* -------------------------------------------------------------------------- */
/*                                UTIL                                        */
/* -------------------------------------------------------------------------- */

/**
 * Evita que el path incluya el nombre del bucket.
 * Ej: "post-images/img.jpg" → "img.jpg"
 */
function normalizePath(path = '', bucket = '') {
  if (!path || !bucket) return path
  const prefix = `${bucket.replace(/\/+$/, '')}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : path
}

/**
 * Quita barras redundantes del folder
 */
function normalizeFolder(folder = '') {
  return folder.replace(/^\/+|\/+$/g, '')
}

/* -------------------------------------------------------------------------- */
/*                                   UPLOAD                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sube archivo a Supabase Storage.
 * Retorna: { path, publicUrl }
 */
export async function uploadFile(path, file, bucket = DEFAULT_BUCKET, options = {}) {
  if (!path || !file) throw new Error('uploadFile: path y file son requeridos')

  const safePath = normalizePath(path, bucket)
  const { cacheControl = '3600', upsert = false, metadata = {} } = options

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, file, { cacheControl, upsert, metadata })

  if (error) {
    console.error('[storage.uploadFile] Error al subir archivo:', error)
    throw error
  }

  // Obtener URL pública si está disponible
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return {
    path: data.path,
    publicUrl: urlData?.publicUrl || null
  }
}

/* -------------------------------------------------------------------------- */
/*                                 AVATAR UPLOAD                              */
/* -------------------------------------------------------------------------- */

export async function uploadUserAvatar(file, userId, bucket = DEFAULT_BUCKET) {
  if (!file) throw new Error('uploadUserAvatar: file requerido')
  if (!userId) throw new Error('uploadUserAvatar: userId requerido')

  const safeName = (file.name || 'avatar').replace(/\s+/g, '_')
  const path = `avatars/${userId}/${Date.now()}_${safeName}`

  return uploadFile(path, file, bucket, { metadata: { owner_id: userId } })
}

/* -------------------------------------------------------------------------- */
/*                          GENERIC IMAGE UPLOAD                              */
/* -------------------------------------------------------------------------- */

/**
 * uploadImageToStorage(file, opts)
 * opts: { bucket, userId, folder, metadata, upsert }
 * Auto-organiza rutas para posts y uploads.
 */
export async function uploadImageToStorage(file, opts = {}) {
  if (!file) throw new Error('uploadImageToStorage: file requerido')

  const bucket = opts.bucket ?? DEFAULT_BUCKET

  // Caso avatar
  if (opts.userId && bucket === DEFAULT_BUCKET) {
    return uploadUserAvatar(file, opts.userId, bucket)
  }

  const safeName = (file.name || 'file').replace(/\s+/g, '_')
  const baseFolder = opts.folder ?? (bucket === POSTS_BUCKET ? 'post-files' : 'uploads')
  const folder = normalizeFolder(baseFolder)
  const userPrefix = opts.userId ? `${opts.userId}/` : ''

  const finalPath = `${folder}/${userPrefix}${Date.now()}_${safeName}`
    .replace(/\/+/g, '/')
    .replace(/^\//, '')

  return uploadFile(finalPath, file, bucket, {
    metadata: opts.metadata ?? {},
    upsert: !!opts.upsert
  })
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export async function deleteFile(paths, bucket = DEFAULT_BUCKET) {
  const list = Array.isArray(paths) ? paths : [paths]
  const normalized = list.map(p => normalizePath(p, bucket))

  const { error } = await supabase.storage
    .from(bucket)
    .remove(normalized)

  if (error) {
    console.error('[storage.deleteFile] Error al eliminar:', error)
    throw error
  }

  return true
}

/* -------------------------------------------------------------------------- */
/*                                    URLS                                    */
/* -------------------------------------------------------------------------- */

export function getFileURL(pathOrUrl, bucket = DEFAULT_BUCKET) {
  if (!pathOrUrl) return null

  // Ya es una URL absoluta → la devolvemos
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  const safePath = normalizePath(pathOrUrl, bucket)

  const { data } = supabase.storage.from(bucket).getPublicUrl(safePath)
  return data?.publicUrl ?? null
}

export async function getSignedUrl(path, expiresSeconds = 60 * 60, bucket = DEFAULT_BUCKET) {
  if (!path) throw new Error('getSignedUrl: path requerido')

  const safePath = normalizePath(path, bucket)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(safePath, expiresSeconds)

  if (error) {
    console.error('[storage.getSignedUrl] Error:', error)
    throw error
  }

  return data.signedUrl
}
