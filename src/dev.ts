import fastify from './app.js';

const start = async () => {
  try {
    const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`🚀 Server ready at ${address}`);
    console.log(`📄 Docs at ${address}/docs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();