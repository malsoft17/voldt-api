import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/downloader/youtube';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await clipToYt(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Download video & audio from YouTube',
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

async function clipToYt(url: string) {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    if(!url) throw new Error('Parameter url is required');
    const form = JSON.stringify({ url });
    const { data } = await axios.post('https://www.clipto.com/api/youtube', form, {
      headers: {
        'content-type': 'application/json',
        'origin': 'https://www.clipto.com',
        'referer': 'https://www.clipto.com/media-downloader/youtube-downloader',
        'user-agent': userAgent
      }
    });
    const { success, ...rest } = data;
    return {
      success: true,
      result: rest
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    };
  }
}