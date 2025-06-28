import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/discovery/latestnewskompas';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const data = await getLatestNewsFromKompas();
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get latest news from kompas.com',
      tags: ['Discovery'],
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

async function getLatestNewsFromKompas() {
  try {
    const { data } = await axios.get('https://www.kompas.com/', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    const result: any[] = [];
    $('.hlItem').each((_, e) => {
      const title = $(e).find('h1.hlTitle').text().trim();
      const thumbnail = $(e).find('.hlImg img').attr('src') || $(e).find('.hlImg img').attr('data-src');;
      const url = $(e).find('a').attr('href');
      result.push({
        title,
        thumbnail,
        url
      });
    });
    return {
      ok: true,
      result
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}