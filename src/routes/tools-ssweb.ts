import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tools/ssweb';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await pikwy(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Screenshot a website',
      tags: ['Tools'],
      parameters: [
        {
          name: 'url',
          in: 'query',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  result: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default {
  path,
  register,
  docs
}

async function pikwy(url: string) {
  try {
    if(!url) throw new Error('Parameter url is required');

    const res = await axios.get(`https://api.pikwy.com/?tkn=125&d=3000&u=${url}&fs=0&w=1920&h=1080&s=100&z=100&f=jpg&rt=jweb`);
    if(!res) return {
      ok: false,
      message: 'No response from server'
    }

    const data = res.data;
    if(!data || !data.durl) return {
      ok: false,
      message: 'Data not found'
    }

    return {
      ok: true,
      result: data.durl
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}