import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tools/ssweb';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const { fullSize } = req.query as { fullSize: string };
    const data = await pikwy(url, fullSize);

    const { data: imageBuffer } = await axios.get(data.result, {
      responseType: 'arraybuffer'
    })
    return reply.type('image/jpeg').send(imageBuffer);
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
        },
        {
          name: 'fullSize',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            enum: [
              'true',
              'false'
            ],
            default: 'false'
          }
        }
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'image/jpeg': {
              schema: {
                type: 'string',
                format: 'binary'
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

async function pikwy(url: string, fullSize: string) {
  try {
    if(!url) throw new Error('Parameter url is required');
    if(!fullSize) throw new Error('Parameter fullSize is required');

    let fs;
    if(fullSize === 'true') {
      fs = 1;
    } else if(fullSize === 'false') {
      fs = 0;
    }

    const res = await axios.get(`https://api.pikwy.com/?tkn=125&d=3000&u=${url}&fs=${fs}&w=1920&h=1080&s=100&z=100&f=jpg&rt=jweb`);
    if(!res) return {
      success: false,
      message: 'No response from server'
    }

    const data = res.data;
    if(!data || !data.durl) return {
      success: false,
      message: 'Data not found'
    }

    return {
      success: true,
      result: data.durl
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}