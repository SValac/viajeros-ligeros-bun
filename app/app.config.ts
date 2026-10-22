export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: 'cursor-pointer',
      },
    },
    // No pulsing for people who turned animations off
    skeleton: {
      base: 'motion-reduce:animate-none',
    },
  },
});
