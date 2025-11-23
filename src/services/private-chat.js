import { supabase } from "./supabase";

// Creamos un pequeño caché local para ir guardando los ids de los chats privados
// que vamos obteniendo en esta sesión.
// La idea va a ser que cada vez que busquemos un chat privado, primero verifiquemos
// si no lo tenemos ya en este caché.
// Solo si no está, lo vamos a buscar y/o crear, para luego agregarlo al caché.
// Para organizar cada conversación, le vamos a asignar un id que sea la unión
// de los dos ids de los participantes, ordenados, y concatenados con un "_".
// Por ejemplo: "userId1_userId2".
let privateChatCache = {}

function addToPrivateChatCache(senderId, receiverId, value) {
    const key = [senderId, receiverId].sort().join('_');
    privateChatCache[key] = value;
}

function getFromPrivateChatCache(senderId, receiverId) {
    const key = [senderId, receiverId].sort().join('_');
    return privateChatCache[key] ?? null;
}

async function fetchOrCreatePrivateChat(senderId, receiverId) {
    // Primero, buscamos en el caché.
    const cached = getFromPrivateChatCache(senderId, receiverId);
    if(cached) return cached;

    let privateChat = await fetchPrivateChat(senderId, receiverId);

    if(!privateChat) {
        privateChat = await createPrivateChat(senderId, receiverId);
    }

    // Agregamos el chat al caché.
    addToPrivateChatCache(senderId, receiverId, privateChat);

    return privateChat;
}

async function fetchPrivateChat(senderId, receiverId) {
    // Ordenamos los ids.
    const [userId1, userId2] = [senderId, receiverId].sort();

    const { data, error } = await supabase
        .from('private_chats')
        .select()
        .eq('user_id1', userId1)
        .eq('user_id2', userId2);
    
    if(error) {
        console.error('[private-chat.js fetchPrivateChat] Error al traer el chat privado: ', error);
        throw new Error(error.message);
    }

    return data[0] ?? null;
}

async function createPrivateChat(senderId, receiverId) {
    // Ordenamos los ids.
    const [userId1, userId2] = [senderId, receiverId].sort();

    // Como no existe, lo creamos y lo traemos.
    const { data, error } = await supabase
        .from('private_chats')
        .insert({
            user_id1: userId1,
            user_id2: userId2,
        })
        // Traemos el registro del chat creado.
        .select();
    
    if(error) {
        console.error('[private-chat.js createPrivateChat] Error al crear el chat privado: ', error);
        throw new Error(error.message);
    }

    // Retorna el chat creado.
    return data[0];
}

export async function sendNewPrivateChatMessage(senderId, receiverId, content) {
    // Para poder grabar el mensaje, necesitamos tener el chat privado.
    // Obtenemos el registro del privado de la conversación.
    const privateChat = await fetchOrCreatePrivateChat(senderId, receiverId);

    const { error: errorMessage } = await supabase
        .from('private_chat_messages')
        .insert({
            chat_id: privateChat.id,
            sender_id: senderId,
            content,
        });
    
    if(errorMessage) {
        console.error('[private-chat.js sendNewPrivateChatMessage] Error al enviar mensaje del chat privado: ', errorMessage);
        throw new Error(errorMessage.message);
    }
}

export async function fetchLastPrivateChatMessages(senderId, receiverId) {
    const privateChat = await fetchOrCreatePrivateChat(senderId, receiverId);

    const { data, error } = await supabase
        .from('private_chat_messages')
        .select()
        .eq('chat_id', privateChat.id);
    
    if(error) {
        console.error('[private-chat.js fetchLastPrivateChatMessages] Error al traer los mensajes del chat privado: ', error);
        throw new Error(error.message);
    }

    return data;
}

export async function subscribeToNewPrivateChatMessages(senderId, receiverId, callback) {
    const privateChat = await fetchOrCreatePrivateChat(senderId, receiverId);

    const chatChannel = supabase.channel('private_chat_messages');

    chatChannel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            table: 'private_chat_messages',
            // Necesitamos especificar que solo nos interesan los mensajes de esta 
            // conversación.
            filter: 'chat_id=eq.' + privateChat.id,
        },
        payload => {
            callback(payload.new);
        }
    );

    chatChannel.subscribe();

    return () => {
        chatChannel.unsubscribe();
    }
}


// ------------------------------------------------------------------
// Tests para probar chat privado.
// La idea de "testing" se basa en armar un código (generalmente 
// funciones o métodos) que realice una acción contra el sistema, y
// verifique que el resultado de esa acción cumpla con lo esperado.
// Idealmente, deberíamos testear todos los caminos posibles, tanto
// de éxito, como de error.
// async function testCantReadPrivateChatIfImNotIn() {
//     // Este test requiere no estar autenticado como ninguno de los
//     // dos usuarios, y que exista la conversación que estamos buscando.

//     const saraId = "99a296a5-0a51-4020-bfee-dabe48fc39fe";
//     const pepeId = "b669c856-1e82-468d-bef5-4a310dcc6251";

//     const { data, error } = await supabase
//         .from('private_chats')
//         .select()
//         .eq('user_id1', saraId)
//         .eq('user_id2', pepeId);

//     if(error) {
//         console.error('‼ [Test] Error inesperado al tratar de leer una conversación.');
//     }

//     if(data.length > 0) {
//         console.warn('❌ [Test] Pudimos traer una conversación en la que no formamos parte. ', data);
//     } else {
//         console.log('🆗 [Test] No pudimos traer una conversación en la que no formamos parte. ');
//     }
// }

// async function testCantCreatePrivateChatIfImNotAPartOf() {
//     const userId = "1d9d4a5d-08b1-4826-967e-a94b4090e47e";
//     const pepeId = "b669c856-1e82-468d-bef5-4a310dcc6251";

//     const { error } = await supabase
//         .from('private_chats')
//         .insert({
//             user_id1: userId,
//             user_id2: pepeId,
//         });
    
//     if(error) {
//         console.log('🆗 [Test] No pudimos crear una conversación en la que no formamos parte.');
//         return;
//     }

//     console.warn('❌ [Test] Pudimos crear una conversación en la que no formamos parte.');
// }

// async function testCantReadPrivateChatMessagesIfImNotPartOfTheChat() {
//     const chatId = 5;

//     const { data, error } = await supabase
//         .from('private_chat_messages')
//         .select()
//         .eq('chat_id', chatId);

//     if(error) {
//         console.error('‼ [Test] Error inesperado al tratar de leer los mensajes de una conversación.');
//     }

//     if(data.length > 0) {
//         console.warn('❌ [Test] Pudimos traer los mensajes de una conversación en la que no formamos parte. ', data);
//     } else {
//         console.log('🆗 [Test] No pudimos traer los mensajes de una conversación en la que no formamos parte. ');
//     }
// }

// async function testCantSendAPrivateMessageToAChatImNotAPartOf() {
//     const chatId = 5;
//     const senderId = "9d683660-5fb7-43d9-8ac9-176c6583b5c0";
//     const content = "Test";

//     const { error } = await supabase
//         .from('private_chat_messages')
//         .insert({
//             chat_id: chatId,
//             sender_id: senderId,
//             content,
//         });
    
//     if(error) {
//         console.log('🆗 [Test] No pudimos enviar un mensaje en una conversación en la que no formamos parte.');
//         return;
//     }

//     console.warn('❌ [Test] Pudimos enviar un mensaje en una conversación en la que no formamos parte.');
// }

// async function testCantSendAPrivateMessageToAChatImAPartOfButWithoutUsingMyId() {
//     const chatId = 10;
//     const senderId = "b669c856-1e82-468d-bef5-4a310dcc6251";
//     const content = "mensaje incriminatorio";

//     const { error } = await supabase
//         .from('private_chat_messages')
//         .insert({
//             chat_id: chatId,
//             sender_id: senderId,
//             content,
//         });
    
//     if(error) {
//         console.log('🆗 [Test] No pudimos enviar un mensaje en una conversación en la que formamos parte, pero usando el id del otro usuario.');
//         return;
//     }

//     console.warn('❌ [Test] Pudimos enviar un mensaje en una conversación en la que formamos parte, pero usando el id del otro usuario.');
// }

// Probamos.
// testCantReadPrivateChatIfImNotIn();
// testCantCreatePrivateChatIfImNotAPartOf();
// testCantReadPrivateChatMessagesIfImNotPartOfTheChat();
// testCantSendAPrivateMessageToAChatImNotAPartOf();
// testCantSendAPrivateMessageToAChatImAPartOfButWithoutUsingMyId();