import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';
import qs from 'qs';

const path = '/api/downloader/instagram';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await kolIg(url);
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
                  ok: { type: 'boolean' },
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

async function kolIg(url: string) {
  try {
    if(!url) throw new Error('Parameter url is required');
    const html = await axios.get('https://kol.id/download-video/instagram', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
      }
    });
    const $ = cheerio.load(html.data);
    const token = $('input[name=_token]').attr('value');
    const cookie = (html.headers['set-cookie'] as string[]).map(v => v.split(';')[0]).join('; ');
    
    const form = qs.stringify({
      url: url,
      _token: token
    });
    
    const response = await axios.post('https://kol.id/download-video/instagram', form, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'cookie': cookie,
        'origin': 'https://kol.id',
        'referer': 'https://kol.id/download-video/instagram',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
      }
    });
    const $2 = cheerio.load(response.data.html);
    const title = $2('.small-title').text().trim();
    const link = $2('a.btn-instagram').attr('href');
    return {
      ok: true,
      result: {
        title: title || 'Unknown',
        link: link || 'Unknown'
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}