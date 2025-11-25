// src/services/comments.js
import { supabase } from "./supabase.js";

/**
 * Obtener comentarios de un post
 * @param {string|number} postId
 * @returns {Promise<Array>} lista de comentarios (puede venir vacía)
 */
export async function fetchCommentsByPostId(postId) {
  if (!postId) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchCommentsByPostId error:", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Insertar un comentario
 * @param {{post_id: string|number, content: string, author_id: string, author_email?: string}} payload
 * @returns {Promise<Object>} comentario insertado (objeto)
 */
export async function insertComment(payload) {
  if (!payload || !payload.post_id || !payload.content) {
    throw new Error("payload inválido para insertComment");
  } // Si la columna created_at tiene default NOW() en la BD, no hace falta agregarla aquí.

  const { data, error } = await supabase
    .from("comments")
    .insert(payload)
    .select();

  if (error) {
    console.error("insertComment error:", error);
    throw error;
  } // Supabase devuelve un array al hacer .select() tras insert

  return Array.isArray(data) ? data[0] : data;
}

/**
 * Actualizar un comentario (solo uso si lo necesitás)
 * @param {string|number} id
 * @param {Object} patch
 * @returns {Promise<Object>} comentario actualizado
 */
export async function updateComment(id, patch) {
  if (!id) throw new Error("id es requerido para updateComment");

  const { data, error } = await supabase
    .from("comments")
    .update(patch)
    .eq("id", id)
    .select();

  if (error) {
    console.error("updateComment error:", error);
    throw error;
  }

  return Array.isArray(data) ? data[0] : data;
}

/**
 * Eliminar un comentario
 * @param {string|number} id
 * @returns {Promise<any>}
 */
export async function deleteComment(id) {
  if (!id) throw new Error("id es requerido para deleteComment");

  const { data, error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    console.error("deleteComment error:", error);
    throw error;
  }

  return data;
}

/**
 * Suscribirse a cambios realtime en la tabla comments para un post en particular.
 * callback recibirá un objeto { type: 'INSERT'|'UPDATE'|'DELETE', newRow, oldRow }
 * Devuelve una función unsubscribe().
 *
 * Nota: para que las suscripciones funcionen con RLS activado, necesitás políticas
 * SELECT/INSERT/UPDATE/DELETE apropiadas en la tabla.
 *
 * @param {string|number} postId
 * @param {(evt:{type:string,newRow:Object,oldRow:Object})=>void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeToCommentsRealtime(postId, callback) {
  if (!postId || typeof callback !== "function") return () => {};

  const channelName = `public:comments:post_id=eq.${postId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `post_id=eq.${postId}`,
      },
      (payload) => {
        // payload.eventType -> 'INSERT' | 'UPDATE' | 'DELETE'
        const type = payload.eventType;
        const evt = {
          type,
          newRow: payload.new ?? null,
          oldRow: payload.old ?? null,
        };
        try {
          callback(evt);
        } catch (err) {
          console.error("callback subscribeToCommentsRealtime error:", err);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      channel.unsubscribe();
    } catch (err) {
      console.error("Error unsubscribing comments channel:", err);
    }
  };
}
