import Fastify, { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { loadRoutes } from './lib/loadRoutes';

const fastify: FastifyInstance = Fastify({ logger: true });

fastify.register(fastifyMultipart);
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/'
});

const paths = loadRoutes(fastify);

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Karst API',
    version: '1.0.0',
  },
  paths,
};

fastify.get('/docs.json', (req, reply) => {
  reply.send(swaggerSpec);
});

fastify.get('/docs', (req, reply) => {
  reply.redirect('/docs.html');
});

fastify.get('/docs/', (req, reply) => {
  reply.redirect('/docs.html');
});

fastify.get('/', (req, reply) => {
  reply.sendFile('home.html');
});

fastify.setNotFoundHandler((req, reply) => {
  reply.code(404).sendFile('404.html');
});

export default fastify;