import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/discovery/topmanga';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const data = await topManga();
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get top manga list from MAL',
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

async function topManga() {
  try {
    const { data } = await axios.get('https://myanimelist.net/topmanga.php?type=manga');
    const $ = cheerio.load(data);
    const res: any[] = [];
    $('tr.ranking-list').each((i, el) => {
      const title = ($(el).find('img').attr('alt') as string).split('Manga:')[1].trim();
      const rating = $(el).find('span.score-label').text().trim().replace(/n\/a/gi, '');
      const link = $(el).find('a.fl-l').attr('href');
      res.push({ rank: i + 1, title, rating, link });
    });
    return {
      ok: true,
      result: res
    };
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}
