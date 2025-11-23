import { onMounted, ref } from "vue";
import { fetchUserProfileById } from "../services/user-profiles";

export default function useUserProfile(id) {
    const user = ref({
        id: null,
        email: null,
        display_name: null,
        bio: null,
        goal: null,
    });
    const loading = ref(false);

    onMounted(async () => {
        try {
            loading.value = true;

            user.value = await fetchUserProfileById(id);
        } catch (error) {
            // TODO...
        }
        loading.value = false;
    });

    return {
        user,
        loading,
    }
}