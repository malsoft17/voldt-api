import Fastify, { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { loadRoutes } from './lib/loadRoutes.js';

const fastify: FastifyInstance = Fastify({
  logger: true,
  bodyLimit: 100 * 1024 * 1024
});

let totalApiRequests = 0;

fastify.addHook('onRequest', async (request, reply) => {
  const pathname = request.url.split('?')[0];

  if (pathname.endsWith('.html')) {
    return reply.code(404).sendFile('404.html');
  }

  if (
    pathname.startsWith('/api/') &&
    pathname !== '/api/stats'
  ) {
    totalApiRequests++;
  }
});

fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  attachFieldsToBody: true
});

fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/'
});

const paths = await loadRoutes(fastify);

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Voldt API',
    version: '1.0.0'
  },
  paths
};

fastify.get('/api/stats', async (request, reply) => {
  return reply.send({
    status: true,
    totalRequest: totalApiRequests
  });
});

fastify.get('/docs.json', async (request, reply) => {
  return reply.send(swaggerSpec);
});

fastify.get('/docs', async (request, reply) => {
  return reply.sendFile('docs.html');
});

fastify.get('/docs/', async (request, reply) => {
  return reply.redirect('/docs');
});

fastify.get('/', async (request, reply) => {
  return reply.sendFile('home.html');
});

fastify.setNotFoundHandler(async (request, reply) => {
  return reply.code(404).sendFile('404.html');
});

export default fastify;
