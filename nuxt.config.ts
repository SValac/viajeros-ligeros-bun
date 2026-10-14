// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: {
    supabaseSecretKey: '',
    public: {
      supabaseUrl: '',
      supabaseKey: '',
      googleMapsApiKey: '',
      googleMapsMapId: '',
    },
  },
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@pinia/colada-nuxt', '@nuxt/eslint', '@nuxt/ui', '@formkit/auto-animate/nuxt'],
  css: ['~/assets/css/main.css', 'vue3-emoji-picker/css'],
  // utils/ only auto-imports its top-level files; the mappers live one level down, one file per domain.
  imports: {
    dirs: ['utils/mappers'],
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  ssr: false,
});
