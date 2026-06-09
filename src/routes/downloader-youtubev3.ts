import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/downloader/youtubev3';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url, format } = req.query as { url: string, format: 'mp3' | 'mp4' };
    const data = await y2mate(url, format);
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
        },
        {
          name: 'format',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            enum: [
              'mp3',
              'mp4'
            ],
            default: 'mp3'
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function y2mate(url: string, format: 'mp3' | 'mp4' = 'mp3') {
  if(!url) throw new Error('Parameter url is required');
  if(!format) throw new Error('Paramater format is required');

  let attempt = 0;
  let lastError: any;

  while(attempt < 5) {
    attempt++;

    try {
      const keyRes = await axios.get('https://cnv.cx/v2/sanity/key', {
        headers: {
          'origin': 'https://frame.y2meta-uk.com',
          'priority': 'u=1, i',
          'referer': 'https://frame.y2meta-uk.com/',
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
        }
      });

      const key = keyRes.data?.key;
      if(!key) throw new Error('Key not found');

      const body = new URLSearchParams({
        link: url,
        format,
        audioBitrate: format === 'mp3' ? '320' : '128',
        videoQuality: format === 'mp3' ? '720' : '1080',
        filenameStyle: 'pretty',
        vCodec: 'h264',
      });

      const res = await axios.post('https://cnv.cx/v2/converter', body.toString(), {
        headers: {
        'key': key,
        'origin': 'https://frame.y2meta-uk.com',
        'priority': 'u=1, i',
        'referer': 'https://frame.y2meta-uk.com/',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
        }
      });
      
      if(!res.data || Object.keys(res.data).length === 0) {
        throw new Error('Empty response');
      }

      const { status, ...rest } = res.data;

      return {
        success: true,
        result: rest
      }
    } catch (e: any) {
      lastError = e.response?.data || e.message;

      if(attempt < 5) {
        await sleep(1000);
      }
    }
  }

  return {
    success: false,
    message: lastError
  }
}