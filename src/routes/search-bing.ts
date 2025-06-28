import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/search/bing';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { query } = req.query as { query: string };
    const data = await bingSearch(query);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Searching from Bing Search',
      tags: ['Search'],
      parameters: [
        {
          name: 'query',
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

async function bingSearch(query: string) {
  try {
    if(!query) throw new Error('Parameter query is required');
    const { data } = await axios.get(`https://www.bing.com/search`, {
      params: {
        q: query
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    const result: any[] = [];
    $('li.b_algo').each((_, e) => {
      const url = $(e).find('h2 a').attr('href');
      const title = $(e).find('h2 a').text().trim();
      const summary = $(e).find('p').text().trim();
      result.push({
        title,
        summary,
        url
      });
    });
    return {
      ok: true,
      result
    };
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    };
  }
}
