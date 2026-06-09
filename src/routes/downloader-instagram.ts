import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/downloader/instagram';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await theSosialCatIg(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Download Instagram video',
      tags: ['Downloader'],
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
                  type: { type: 'string' },
                  result: { type: 'object' }
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

async function theSosialCatIg(url: string) {
  try {
    if(!url) throw new Error('Parameter url is required');

    const payload = {
      url
    };
    const { data } = await axios.post('https://thesocialcat.com/api/instagram-download', payload);
    const { type, ...rest } = data;
    return {
      success: true,
      type,
      result: rest
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}