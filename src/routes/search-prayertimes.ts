import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/search/jadwalsholat';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { city } = req.query as { city: string };
    const data = await prayerTimes(city);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get prayer times for all cities in Indonesia',
      tags: ['Search'],
      parameters: [
        {
          name: 'city',
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

async function prayerTimes(city: string) {
  try {
    if(!city) throw new Error('Parameter city is required');
    const { data: a } = await axios.get('https://www.jadwalsholat.org/adzan/data/town.php?q=' + city);
    if(a.length === 0) throw new Error('City not found');
    const { data: b } = await axios.get('https://www.jadwalsholat.org/adzan/monthly.php?id=' + a[0].id);
    const $ = cheerio.load(b);
    const res: any[] = [];
    $('.praytime-item').each((_, el) => {
      const element = $(el);
      if (!element.hasClass('hidden')) {
          const nama = element.find('p').first().text().trim();
          const waktu = element.find('.schedule-time').text().trim();
          res.push({ nama, waktu });
      }
    });
    return {
      success: true,
      result: {
        city: a[0].name,
        prayer_times: res
      }
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}
