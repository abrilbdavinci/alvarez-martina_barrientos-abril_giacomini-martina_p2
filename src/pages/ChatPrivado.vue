<script setup>
/*
  ChatPrivado - versión <script setup>
  - Importa componentes/composables/servicios que usabas en el ejemplo.
  - Implementa dos composables locales:
    * usePrivateChatMessages(user, otherId)
    * usePrivateChatNewMessageForm(user, otherId)
*/

import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';

import AppH1 from '../components/AppH1.vue';
import AppLoader from '../components/AppLoader.vue';

import useAuthUserState from '../composables/useAuthUserState';
import useUserProfile from '../composables/useUserProfile';

import {
    fetchLastPrivateChatMessages,
    sendNewPrivateChatMessage,
    subscribeToNewPrivateChatMessages,
} from '../services/private-chat';

import { formatDate } from '../helpers/date';

const route = useRoute();

// usuario autenticado
const authUser = useAuthUserState();

// perfil del otro usuario (id desde route.params.id)
const { user: otherUser, loading: loadingUser } = useUserProfile(route.params.id);
//composable local para mensajes del chat privado
function usePrivateChatMessages(userRef, otherId) {
    const messages = ref([]);
    const loadingMessages = ref(false);
    const chatContainer = ref(null);

    let unsubscribeFromChat = () => { };

    onMounted(async () => {
        loadingMessages.value = true;

        try {
            // obtener últimos mensajes
            messages.value = await fetchLastPrivateChatMessages(userRef.value.id, otherId);
            loadingMessages.value = false;

            // esperar render y scrollear al final
            await nextTick();
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }

            // suscribirse a nuevos mensajes
            unsubscribeFromChat = await subscribeToNewPrivateChatMessages(
                userRef.value.id,
                otherId,
                async (newMessage) => {
                    messages.value.push(newMessage);
                    await nextTick();
                    if (chatContainer.value) {
                        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
                    }
                }
            );
        } catch (error) {
            loadingMessages.value = false;
            console.error('Error cargando mensajes privados:', error);
        }
    });

    onUnmounted(() => {
        if (typeof unsubscribeFromChat === 'function') unsubscribeFromChat();
    });

    return {
        messages,
        loadingMessages,
        chatContainer,
    };
}

//composable local para nuevo mensaje
function usePrivateChatNewMessageForm(userRef, otherId) {
    const newMessage = ref({ content: '' });

    async function handleSubmit() {
        if (!newMessage.value.content || !newMessage.value.content.trim()) return;

        try {
            await sendNewPrivateChatMessage(userRef.value.id, otherId, newMessage.value.content);
            // limpiar campo
            newMessage.value.content = '';
        } catch (error) {
            console.error('Error enviando mensaje privado:', error);
        }
    }

    return {
        newMessage,
        handleSubmit,
    };
}

// inicializar composables con datos actuales
const user = authUser; // ref/readonly desde el composable
const otherId = route.params.id;

const {
    messages,
    loadingMessages,
    chatContainer,
} = usePrivateChatMessages(user, otherId);

const {
    newMessage,
    handleSubmit,
} = usePrivateChatNewMessageForm(user, otherId);

</script>

<template>
    <section class="w-full max-w-5xl mx-auto py-10">
        <div class="flex justify-between items-center mb-6">
            <AppH1>Chat privado con {{ otherUser.email }}</AppH1>
        </div>

        <section ref="chatContainer" class="overflow-y-auto max-h-[500px] p-4 mb-4 border border-gray-300 rounded-md">

            <ol v-if="!loadingMessages" class="flex flex-col gap-4">
                <li v-for="message in messages" :key="message.id" class="p-3 rounded" :class="{
                    'bg-gray-100 self-start rounded-xl': message.sender_id !== user.id,
                    'self-end bg-green-100 rounded-xl': message.sender_id === user.id
                }">
                    <div class="mb-1 text-base text-[#1A1A1A] leading-relaxed">{{ message.content }}</div>
                    <div class="text-xs text-gray-500 pt-2 border-t border-gray-100">{{ formatDate(message.created_at)
                        }}</div>
                </li>
            </ol>

            <template v-else>
                <AppLoader />
            </template>

            <div v-if="!messages.length && !loadingMessages" class="text-center py-8 text-[#4B4B4B]">
                <p class="text-lg mb-2">Todavía no hay mensajes con este usuario</p>
            </div>
        </section>

        <!-- Formulario para enviar nuevo mensaje -->
        <section>
            <h2 class="sr-only">Enviar un mensaje</h2>

            <form action="#" class="flex gap-4 items-stretch" @submit.prevent="handleSubmit">
                <label for="content" class="sr-only">Mensaje</label>
                <textarea id="content" class="w-full p-2 border border-gray-400 rounded-lg" v-model="newMessage.content"
                    placeholder="Escribe tu mensaje..."></textarea>
                <button type="submit"
                    class="transition px-10 py-1 rounded-xl bg-[#179BAE] hover:bg-[#148da0] text-white">Enviar</button>
            </form>
        </section>
    </section>
</template>
