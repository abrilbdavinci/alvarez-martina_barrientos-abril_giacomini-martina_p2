<script>
import AppH1 from '../components/AppH1.vue';

export default {
    name: 'Home',
    components: { AppH1, },
};
</script>

<template>
    <section class="w-full py-12 px-4 sm:py-16 md:py-20 lg:py-24 lg:px-8 hero overflow-hidden">
        <div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">

            <div class="lg:w-1/2 text-center lg:text-left order-1">
                <h2
                    class="text-[#006165] mb-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                    Kälm: Tu asistente personal de <span class="text-[#179BAE]">cuidado</span>.
                </h2>
                <p class="mt-4 text-lg md:text-xl text-[#4B4B4B] leading-relaxed max-w-xl lg:max-w-none mx-auto">
                    Construir una rutina de vida y autocuidado basada en tus necesidades únicas de piel y cabello.
                </p>

                <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <RouterLink to="/register"
                        class="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-[100px] shadow-lg transition duration-300 ease-in-out text-white bg-[#29D370] hover:bg-[#19A8BEFF] ">
                        Comenzar GRATIS
                    </RouterLink>
                    <RouterLink to="/publicaciones"
                        class="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-[100px] shadow-lg border-2 border-[#179BAE] text-[#179BAE] bg-white transition duration-300 ease-in-out hover:bg-[#E9F3F4] ">
                        <i class="fa-solid fa-users mr-2"></i>
                        Comunidad Kälm
                    </RouterLink>
                </div>
            </div>

            <div class="lg:w-1/2 w-full relative order-2 flex justify-center lg:justify-end">
                <div
                    class="bg-[#E9F3F4] p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg h-80 sm:h-96 flex flex-col items-center justify-center img-app relative overflow-hidden">

                </div>

                <div
                    class="hidden md:block absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-[#50B7C5] rounded-full blur-3xl opacity-30 z-0">
                </div>
            </div>

        </div>
    </section>

    <hr class="max-w-7xl mx-auto border-t border-[#E9F3F4]">

    <section class="py-16 px-4 md:py-24 sm:px-6 lg:px-8 bg-white">
        <div class="max-w-7xl mx-auto">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-center text-[#006165] mb-14">
                Tu rutina única
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                <div
                    class="flex flex-col items-center text-center p-6 bg-[#E9F3F4] rounded-xl shadow-xl border-t-8 border-[#50B7C5] hover:shadow-2xl transition duration-300 ease-in-out transform hover:-translate-y-1">
                    <div class="flex items-center justify-center w-full mb-4">
                        <div
                            class="bg-[#50B7C5] w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                            1
                        </div>
                        <i class="fa-solid fa-user-pen text-[#50B7C5] text-4xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-[#1A1A1A] mb-2 mt-2">
                        Define tu perfil
                    </h3>
                    <p class="text-[#4B4B4B] text-base">
                        Completa tus datos y propósito: cuidado de piel, cabello o ambos. El inicio de tu viaje.
                    </p>
                </div>

                <div
                    class="flex flex-col items-center text-center p-6 bg-[#E9F3F4] rounded-xl shadow-xl border-t-8 border-[#179BAE] hover:shadow-2xl transition duration-300 ease-in-out transform hover:-translate-y-1">
                    <div class="flex items-center justify-center w-full mb-4">
                        <div
                            class="bg-[#179BAE] w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                            2
                        </div>
                        <i class="fa-solid fa-flask text-[#179BAE] text-4xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-[#1A1A1A] mb-2 mt-2">
                        Análisis personalizado
                    </h3>
                    <p class="text-[#4B4B4B] text-base">
                        Realiza nuestro test adaptado a tus respuestas, tipo de piel y estilo de vida. Ciencia a tu
                        servicio.
                    </p>
                </div>

                <div
                    class="flex flex-col items-center text-center p-6 bg-[#E9F3F4] rounded-xl shadow-xl border-t-8 border-[#006165] hover:shadow-2xl transition duration-300 ease-in-out transform hover:-translate-y-1">
                    <div class="flex items-center justify-center w-full mb-4">
                        <div
                            class="bg-[#006165] w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                            3
                        </div>
                        <i class="fa-solid fa-spa text-[#006165] text-4xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-[#1A1A1A] mb-2 mt-2">
                        Rutina personalizada
                    </h3>
                    <p class="text-[#4B4B4B] text-base">
                        Obtén una rutina clara, guiada y paso a paso, generada según tus resultados. Simple y efectiva.
                    </p>
                </div>

                <div
                    class="flex flex-col items-center text-center p-6 bg-[#E9F3F4] rounded-xl shadow-xl border-t-8 border-[#29D370] hover:shadow-2xl transition duration-300 ease-in-out transform hover:-translate-y-1">
                    <div class="flex items-center justify-center w-full mb-4">
                        <div
                            class="bg-[#29D370] w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                            4
                        </div>
                        <i class="fa-solid fa-chart-line text-[#29D370] text-4xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-[#1A1A1A] mb-2 mt-2">
                        Dashboard personal
                    </h3>
                    <p class="text-[#4B4B4B] text-base">
                        Visualiza tu progreso, celebra tus logros y mantén tus hábitos saludables. Progreso continuo.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <hr class="max-w-7xl mx-auto border-t border-[#E9F3F4]">

    <section class="py-16 px-4 sm:py-20 lg:py-24 lg:px-8 bg-white">
        <div
            class="max-w-5xl mx-auto text-center p-8 sm:p-12 ">
            <h2 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#006165] mb-4 tracking-tight">
                ¿Listo para empezar?
            </h2>
            <p class="text-lg md:text-xl text-[#4B4B4B] mb-8">
                Tu rutina de cuidado propio perfecta y a la medida está a solo un click.
            </p>
            <RouterLink to="/register"
                class="inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-[100px] shadow-xl transition duration-300 ease-in-out text-white bg-[#29D370]">
                Comenzar GRATIS
            </RouterLink>
        </div>
    </section>
</template>
