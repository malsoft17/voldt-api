import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/txt2imgv2';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { prompt } = req.query as { prompt: string };
    const data = await txt2img(prompt);

    if (!data || !data.result) {
      return reply.send({
        success: false,
        message: 'Failed while generating image'
      });
    }

    const res = await axios.get(data.result, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
     });

    const contentType = res.headers['content-type'];
    if (!contentType) {
      return reply.send({
        success: false,
        message: 'Invalid image response'
      });
    }

    return reply
      .type(contentType)
      .send(res.data);
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

async function txt2img(prompt: string) {
  try {
    if(!prompt) throw new Error('Parameter prompt is required');

    const token = (await axios.get('https://api.nexray.web.id/tools/bypass/cf-turnstile?url=https%3A%2F%2Fimage-generation.perchance.org%2Fembed&siteKey=0x4AAAAAAAA8g8NphwaSOT59', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
    })).data.result;

    let userKey;
    let attempts = 0;
    const maxAttempts = 10;

    while (!userKey && attempts < maxAttempts) {
      attempts++;

      try {
        const res = await axios.get(
          `https://image-generation.perchance.org/api/verifyUser?token=${token}&thread=0&__cacheBust=${Math.random()}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
            }
          }
        );

        userKey = res.data.userKey;

        if (!userKey) {
          const fallback = await axios.get(
            `https://image-generation.perchance.org/api/verifyUser?thread=0&__cacheBust=${Math.random()}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
              }
            }
          );

          userKey = fallback.data.userKey;
        }

      } catch (err) {
        console.error(`Attempt ${attempts} failed`);
      }
    }

    if (!userKey) {
      throw new Error('Failed to get userKey after 10 attempts');
    }

    const adAccessCode = (await axios.get('https://perchance.org/api/getAccessCodeForAdPoweredStuff', {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
    })).data;

    const requestId = Math.random();

    const body = {
      prompt: `A casual photo. A casual photo of ${prompt}. It's a casual photo.`,
      negativePrompt: '',
      seed: -1,
      resolution: '768x768',
      guidanceScale: 7,
      channel: 'ai-text-to-image-generator',
      subChannel: 'public',
      userKey: userKey,
      adAccessCode: adAccessCode,
      requestId: requestId
    };
    
    const imageId = (await axios.post(`https://image-generation.perchance.org/api/generate?userKey=${userKey}&adAccessCode=${adAccessCode}&requestId=${requestId}&__cacheBust=${Math.random()}`, body, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
    })).data.imageId;

    if(!imageId) throw new Error('Failed while generating image');

    return {
      success: true,
      result: `https://image-generation.perchance.org/api/downloadTemporaryImage?imageId=${imageId}`
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data || e.message
    };
  }
}