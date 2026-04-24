export default defineNuxtPlugin(() => {
  const providerStore = useProviderStore();
  providerStore.fetchAll();
});
