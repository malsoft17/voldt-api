import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultResponses = {
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { default: false },
            message: { default: 'An error occured' },
          },
        },
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { default: false },
            message: { default: 'An error occured' },
          },
        },
      },
    },
  },
};

interface RouteModule {
  path: string;
  register: (fastify: FastifyInstance) => void;
  docs?: Record<string, any>;
}

export const loadRoutes = async(fastify?: FastifyInstance): Promise<Record<string, any>> => {
  const routesPath = path.join(__dirname, '../routes');
  const paths: Record<string, any> = {};

  const files = fs.readdirSync(routesPath);

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

    const mod = await import(path.join(routesPath, file));
    const route: RouteModule = mod.default;

    if (route.path && typeof route.register === 'function' && fastify) route.register(fastify);

    if (route.docs) {
      for (const [routePath, methods] of Object.entries(route.docs)) {
        if (!paths[routePath]) paths[routePath] = {};

        for (const [method, doc] of Object.entries(methods)) {
          if (typeof doc === 'object' && doc !== null) {
            paths[routePath][method] = {
              ...(doc as Record<string, any>),
              responses: {
                ...defaultResponses,
                ...(doc as any).responses || {},
              },
            };
          }
        }        
      }
    }
  }

  return paths;
};