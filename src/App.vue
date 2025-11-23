<script>
import { logout, subscribeToAuthStateChanges } from './services/auth';

export default {
    name: 'App',
    data() {
        return {
            user: {
                id: null,
                email: null,
            },
            
        }
    },
    methods: {
        handleLogout() {
            logout();
            this.$router.push('/login');
        },
    },
    mounted() {
        subscribeToAuthStateChanges(newUserState => this.user = newUserState);
    }
}
</script>

<template>
    <nav
        class="fixed top-0 left-0 w-full flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 bg-[#E9F3F4] rounded-b-[20px] z-50 transition-all duration-300">

        <!-- Logo / título -->
        <div class="brand flex items-center gap-2">
            <img src="/favicon/favicon.ico" alt="" class="w-10 h-10 sm:w-12 sm:h-12 md:w-8 md:h-8" />
            <RouterLink to="/">
                <p class="hidden md:block text-lg md:text-2xl font-bold text-[#006165] whitespace-nowrap">
                    Kälm <span class="text-[#179BAE]">| Skincare & Haircare</span>
                </p>
            </RouterLink>

        </div>

        <!-- Menú -->
        <ul
            class="flex items-center gap-2 sm:gap-3 md:gap-6 text-sm md:text-base font-medium text-[#1A1A1A] flex-wrap justify-end">

            <template v-if="user.id === null">
                <li>
                    <RouterLink to="/login"
                        class="px-6 py-2 bg-[#50B7C5] text-white rounded-[100px] transition block text-center">
                        Ingresar
                    </RouterLink>
                </li>
                <li>
                    <RouterLink to="/register"
                        class="px-4 py-2 border border-[#179BAE] text-[#179BAE] rounded-[100px] transition block text-center">
                        Crear cuenta
                    </RouterLink>
                </li>
            </template>

            <template v-else>
                <li>
                    <RouterLink to="/publicaciones" class="hover:text-[#179BAE] transition block text-center">
                        Publicaciones
                    </RouterLink>
                </li>
                <li>
                    <RouterLink to="/mi-perfil" class="hover:text-[#179BAE] transition block text-center">
                        Mi perfil
                    </RouterLink>
                </li>
                <li class="text-[#727F81FF]">{{ user.email }}</li>
                <li>
                    <form action="#" @submit.prevent="handleLogout" class="m-0">
                        <button type="submit"
                            class="px-4 py-2 bg-[#F8393C] text-white rounded-[100px] transition block text-center">
                            <i class="fa fa-power-off"></i>
                            Cerrar sesión
                        </button>
                    </form>
                </li>
            </template>
        </ul>
    </nav>

    <main
        class="mx-auto max-w-7xl flex flex-col justify-start items-center min-h-screen pt-24 pb-24 px-4 sm:px-4 md:px-4 lg:px-0 bg-white text-[#1A1A1A]">
        <RouterView />
    </main>


    <footer
        class="fixed bottom-0 left-0 w-full flex justify-center items-center h-16 bg-[#006165] text-white rounded-t-[20px] shadow-sm shadow-gray-300 text-center text-sm md:text-base">
        <p>Parcial 1 - CWM - DWM4AP | Alvarez Barrientos Giacomini</p>
    </footer>
</template>
