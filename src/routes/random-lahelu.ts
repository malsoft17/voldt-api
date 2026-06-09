import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/random/lahelu';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const data = await lahelu();
    return reply.send(data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get random meme from lahelu',
      tags: ['Random'],
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

async function lahelu() {
  const randomNumber = Math.floor(Math.random() * 101).toString();
  const apiUrl = 'https://lahelu.com/api/post/get-recommendations?field=5&cursor=' + randomNumber;

  try {
    const { data } = await axios.get(apiUrl);
    const postInfos = data.postInfos || [];

    if (postInfos.length === 0) {
      return { success: false, message: 'No recommendations found.' };
    }

    const randomIndex = Math.floor(Math.random() * postInfos.length);
    const res = postInfos[randomIndex];

    if (!res) {
      return { success: false, message: 'No post found at selected index.' };
    }

    return {
      success: true,
      result: {
        title: res.title || '',
        media: res.media || ''
      }
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    };
  }
}
