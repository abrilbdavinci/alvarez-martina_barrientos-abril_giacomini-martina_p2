<script>
import AppH1 from '../components/AppH1.vue';
import { register } from '../services/auth';

export default {
    name: 'Register',
    components: { AppH1 },
    data() {
        return {
            loading: false,
            user: {
                email: '',
                password: '',
            },
        }
    },
    methods: {
        async handleSubmit() {
            try {
                this.loading = true;
                register(this.user.email, this.user.password);
                this.$router.push('/publicaciones');
            } catch (error) {
                console.error("Error: ", error);
            }
            this.loading = false;
        },
    },
}
</script>

<template>
    <div class="w-full justify-center items-centermx-auto  py-10">
        <AppH1 class="text-center mb-8 text-[#006165] font-bold text-3xl">
                Crear una cuenta
            </AppH1>

            <form @submit.prevent="handleSubmit" class="flex flex-col gap-6">
                <!-- Campo Email -->
                <div class="flex flex-col">
                    <label for="email" class="block text-[#4B4B4B] mb-2 font-medium">
                        Email
                    </label>
                    <input type="email" id="email" v-model="user.email"
                        class="w-full p-4 rounded-[100px] border border-[#50B7C5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#179BAE] transition duration-200" />
                </div>

                <!-- Campo Contraseña -->
                <div class="flex flex-col">
                    <label for="password" class="block text-[#4B4B4B] mb-2 font-medium">
                        Contraseña
                    </label>
                    <input type="password" id="password" v-model="user.password"
                        class="w-full p-4 rounded-[100px] border border-[#50B7C5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#179BAE] transition duration-200" />
                </div>

                <!-- Botón -->
                <button type="submit" :disabled="loading"
                    class="mt-4 w-full p-4 bg-[#179BAE] text-[#E9F3F4] font-semibold rounded-[100px] shadow-md disabled:opacity-70 hover:bg-[#147a8a] transition-colors duration-200">
                    {{ loading ? 'Creando...' : 'Crear cuenta' }}
                </button>
            </form>
    </div>
</template>

