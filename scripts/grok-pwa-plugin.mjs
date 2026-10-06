export function grokPwaPlugin() {
  return {
    name: 'grok-pwa-plugin',
    configureServer(server) {
      // Minimal implementation for dev server
      server.middlewares.use((req, res, next) => {
        next();
      });
    },
  };
}
