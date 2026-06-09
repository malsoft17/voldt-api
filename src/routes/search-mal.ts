import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/search/mal';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { query } = req.query as { query: string };
    const data = await malSearch(query);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get anime details from MAL',
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

async function malSearch(query: string) {
  if(!query) throw new Error('Parameter query is required');
  const URL = `https://myanimelist.net/search/prefix.json?type=all&keyword=${encodeURIComponent(query)}&v=1`;

  const formData = new FormData();
  formData.append('type', 'all');
  formData.append('keyword', query),
  formData.append('v', '1');

  const headers = {
    'authority': 'myanimelist.net',
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'referer': 'https://myanimelist.net/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest'
  }
  try {
    const { data } = await axios.post(URL, formData, { headers });
    const exactMatch = data.categories[0].items.find((item: Record<string, any>) => item.name.toLowerCase() === query.toLowerCase());
    let anime;
    if(exactMatch) {
      anime = exactMatch;
    } else {
      const bestMatch = data.categories[0].items.find((item: Record<string, any>) => item.name.toLowerCase().includes(query.toLowerCase()));

      if(bestMatch) {
        anime = bestMatch;
      } else {
        if(data.categories.length != 0 || data.categories[0].items.length != 0) {
          anime = data.categories[0].items[0];
        } else {
          return {
            success: false,
            message: 'No anime found'
          }
        }
      }
    }
    
    const { data: dataResult } = await axios.get(anime.url);
    const $ = cheerio.load(dataResult);
    const title = $('h1.title-name.h1_bold_none').text();
    const thumbnail = $('img.lazyload').attr('data-src');
    const episodes = $('span:contains("Episodes")').parent().contents().filter((_, elem) => elem.type === 'text').text().trim();
    const score = $('div.score-label').text();
    const ranked = '#' + ($('span strong').text().split('#')[1] || $('span strong').text());
    const genres = $('span:contains("Genres")').nextAll('a').map((i, elem) => $(elem).text()).get().join(', ');
    const type = $('span:contains("Type")').next('a').text();
    const studios = $('span:contains("Studios")').next('a').text();
    const premiered = $('span:contains("Premiered")').next('a').text();
    const url = anime.url;
    const synopsis = $('p[itemprop="description"]').text().replace('\n\n[Written by MAL Rewrite]', '');
    return {
      success: true,
      result: {
        title,
        thumbnail,
        episodes,
        score,
        ranked,
        genres,
        type,
        studios,
        premiered,
        url,
        synopsis
      }
    }
  } catch(e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}
