import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/discovery/topanime';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const data = await topAnime();
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get top anime list from MAL',
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

async function topAnime() {
  try {
    const { data } = await axios.get('https://myanimelist.net/topanime.php');
    const $ = cheerio.load(data);
    const result: any[] = [];
    $('tr.ranking-list').each((i, el) => {
      const title = $(el).find('h3.fl-l').text().trim();
      const rating = $(el).find('td.score').text().trim();
      const link = $(el).find('a.fl-l').attr('href');
      result.push({
        rank: i + 1,
        title,
        rating,
        link
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
    }
  }
}
