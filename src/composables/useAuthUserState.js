import { onMounted, onUnmounted, ref } from "vue";
import { subscribeToAuthStateChanges } from "../services/auth";

export default function useAuthUserState() {
    let unsubscribeFromAuth = () => {}; // Esta función es un "placeholder".

    const user = ref({
        id: null,
        email: null,
        display_name: null,
        bio: null,
        goal: null,
        photo_url: null,
    });

    onMounted(() => unsubscribeFromAuth = subscribeToAuthStateChanges(newState => user.value = newState));

    onUnmounted(() => unsubscribeFromAuth());

    return user;
}