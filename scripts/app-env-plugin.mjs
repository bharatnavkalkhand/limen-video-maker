export function appEnvPlugin() {
  return {
    name: 'app-env-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__app-env') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ VITE_AUTH_ENABLED: process.env.VITE_AUTH_ENABLED || 'false' }));
          return;
        }
        next();
      });
    },
  };
}
