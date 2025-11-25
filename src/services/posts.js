// src/services/posts.js
import { supabase } from './supabase.js'

/**
 * Crear un nuevo post.
 * payload puede incluir: { sender_id, user_email, theme, content, image_url, image_path }
 */
export async function createPost(payload) {
  if (!payload || !payload.sender_id) {
    throw new Error('createPost: payload inválido. sender_id es requerido.')
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[posts.js createPost] Error:', error)
    throw error
  }

  return data
}

/** Traer todos los posts (más recientes primero) */
export async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Aseguramos que todos los posts tengan image_url_1 / 2 válidos
  return data.map(post => ({
    ...post,
    image_url_1: post.image_url_1 || (post.image_path_1 ? getFileURL(post.image_path_1, POSTS_BUCKET) : null),
    image_url_2: post.image_url_2 || (post.image_path_2 ? getFileURL(post.image_path_2, POSTS_BUCKET) : null)
  }))
}
/** Traer un post por su id */
export async function fetchPostById(id) {
  if (!id) return null

  const { data, error } = await supabase
    .from('posts')
    .select('id, sender_id, user_email, theme, content, image_url_1, image_path_1, image_url_2, image_path_2, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[posts.js fetchPostById] Error:', error)
    throw error
  }

  if (!data) return null

  // Resolver URLs públicas de las imágenes
  data.image_url_1 = data.image_url_1 || (data.image_path_1 ? await getFileURL(data.image_path_1, POSTS_BUCKET) : null)
  data.image_url_2 = data.image_url_2 || (data.image_path_2 ? await getFileURL(data.image_path_2, POSTS_BUCKET) : null)

  return data
}

/** Traer posts de un usuario por sender_id */
export async function fetchPostsByUserId(sender_id) {
  if (!sender_id) {
    throw new Error('[posts.js fetchPostsByUserId] sender_id es obligatorio')
  }

  const { data, error } = await supabase
    .from('posts')
    .select('id, sender_id, user_email, theme, content, image_url, image_path, created_at')
    .eq('sender_id', sender_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[posts.js fetchPostsByUserId] Error:', error)
    throw error
  }

  return data ?? []
}

/** Actualizar un post (patch: object con campos a actualizar) */
export async function updatePost(postData) {
  const { id, content, theme, image_url_1, image_path_1, image_url_2, image_path_2 } = postData
  const { data, error } = await supabase
    .from('posts')
    .update({
      content,
      theme,
      image_url_1,
      image_path_1,
      image_url_2,
      image_path_2
    })
    .eq('id', id)

  if (error) throw error
  return data
}


/** Eliminar un post por id */
export async function deletePost(id) {
  if (!id) throw new Error('deletePost: id es requerido')

  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .select()

  if (error) {
    console.error('[posts.js deletePost] Error:', error)
    throw error
  }

  return data ?? []
}

/**
 * Suscribirse a nuevos posts (INSERT global sobre la tabla posts).
 * callback recibe el nuevo row: callback(newRow)
 * Devuelve una función unsubscribe()
 */
export function subscribeToNewPosts(callback) {
  if (typeof callback !== 'function') return () => {}

  const channel = supabase
    .channel('public:posts:inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        try {
          callback(payload.new)
        } catch (err) {
          console.error('[posts.js subscribeToNewPosts] callback error:', err)
        }
      }
    )
    .subscribe()

  return () => {
    try {
      channel.unsubscribe()
    } catch (err) {
      console.error('[posts.js subscribeToNewPosts] unsubscribe error:', err)
    }
  }
}

/**
 * Suscribirse a cambios en un post en particular (INSERT/UPDATE/DELETE filtrado por id).
 * callback recibe un objeto { eventType: 'INSERT'|'UPDATE'|'DELETE', newRow, oldRow }
 * Devuelve unsubscribe()
 */
export function subscribeToPostRealtime(postId, callback) {
  if (!postId || typeof callback !== 'function') return () => {}

  const filter = `id=eq.${postId}`
  const channel = supabase
    .channel(`public:posts:id=eq.${postId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts', filter },
      (payload) => {
        try {
          callback({
            eventType: payload.eventType,
            newRow: payload.new ?? null,
            oldRow: payload.old ?? null
          })
        } catch (err) {
          console.error('[posts.js subscribeToPostRealtime] callback error:', err)
        }
      }
    )
    .subscribe()

  return () => {
    try {
      channel.unsubscribe()
    } catch (err) {
      console.error('[posts.js subscribeToPostRealtime] unsubscribe error:', err)
    }
  }
}
