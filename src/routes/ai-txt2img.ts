import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/txt2img';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { prompt } = req.query as { prompt: string };
    const data = await hf_txt2img(prompt);
    const imgResponse = await axios.get(data?.result, { responseType: 'arraybuffer' });
    return reply.type('image/png').send(imgResponse.data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Create an image from prompt',
      tags: ['AI'],
      responses: {
        200: {
          description: 'OK',
          content: {
            'image/png': {
              schema: {
                type: 'string',
                default: 'Buffer'
              }
            }
          }
        }
      },
      parameters: [
        {
          name: 'prompt',
          in: 'query',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ]
    }
  }
};

export default {
  path,
  register,
  docs
}

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function hf_txt2img(prompt: string) {
  const randomString = generateRandomString(5);
  let attempts = 0;
  let res;
  do {
    if(attempts > 5) break;
    attempts++;
    try {
      const { data: data1 } = await axios.post('https://m-ric-text-to-image.hf.space/queue/join?__theme=light', {
        data: [prompt],
        event_data: null,
        fn_index: 0,
        trigger_id: 10,
        session_hash: randomString
      });
      const { data } = await axios.get('https://m-ric-text-to-image.hf.space/queue/data?session_hash=' + randomString);
      const result = data.match(/"url":"(.*?)"/)?.[1];
      res = {
        ok: true,
        result
      }
  
    } catch (e: any) {
      res = {
        ok: false,
        message: e.response?.data?.error || e.message
      }
    }
    if(!res.ok) console.log('Retrying...');
  } while(!res.ok);
  return res;
}