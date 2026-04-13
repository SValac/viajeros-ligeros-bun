// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@pinia-plugin-persistedstate/nuxt', '@nuxt/eslint', '@nuxt/ui'],
  css: ['~/assets/css/main.css', 'vue3-emoji-picker/css'],
  eslint: {
    config: {
      standalone: false,
    },
  },
  ssr: false,
});
