import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';
import axios from 'axios';
import * as cheerio from 'cheerio';

const path = '/api/downloader/spotify';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async (req, reply) => {
    const { url } = req.query as { url: string };
    const data = await spotify(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Download Spotify music from url',
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
                  result: {
                    type: 'array',
                    items: {
                      type: 'object'
                    }
                  }
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

async function spotify(url: string) {
  try {
    if (!url) throw new Error('Parameter url is required!');

    const api = 'https://spotmate.online/convert';
    const res = await axios.get(api);
    
    const $ = cheerio.load(res.data);
    const csrf = $('meta[name="csrf-token"]').attr('content');
    if (!csrf) throw new Error('Unable to get CSRF.');
    
    const cookies = res.headers['set-cookie'];
    if (!cookies) throw new Error('Unable to get cookies.');

    const cookie = `${cookies[0].split(';')[0]};\n${cookies[1].split(';')[0]}`;

    const res2 = await axios.post(api, {
      urls: url
    }, {
      headers: {
        'Cookie': cookie,
        'X-Csrf-Token': csrf
      }
    });
    if (res2.data?.error === true || !res2.data?.url) throw new Error('Unable to get response from server.');

    return {
      success: true,
      result: res2.data.url
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.reponse?.data || e.message
    };
  }
}