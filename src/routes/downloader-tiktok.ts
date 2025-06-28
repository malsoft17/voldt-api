import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';
import qs from 'qs';

const path = '/api/downloader/tiktok';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await ssstik(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'TikTok Link (Support image and video)',
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

async function ssstik(url: string) {
  try {
    if(!url) throw new Error('Parameter url is required');
    const { data: html } = await axios.get('https://ssstik.io/');
    const $ = cheerio.load(html);
    let s_tt = null;

    $('script').each((_, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.includes('s_tt')) {
        const match = scriptContent.match(/s_tt\s*=\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          s_tt = match[1];
          return false;
        }
      }
    });

    const form = qs.stringify({
      id: url,
      locale: 'en',
      tt: s_tt
    });

    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        const { data } = await axios.post('https://ssstik.io/abc?url=dl', form, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://ssstik.io',
            'Referer': 'https://ssstik.io/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
          }
        });

        const $res = cheerio.load(data);
        const linkmp4 = $res('a.without_watermark').attr('href');
        const linkmp3 = $res('a.music').attr('href');

        if (linkmp4) {
          return {
            ok: true,
            type: 'video',
            result: {
              linkmp4: linkmp4 || 'Unknown',
              linkmp3: linkmp3 || 'Unknown'
            }
          };
        }

        const result: any[] = [];
        $res('img[data-splide-lazy]').each((_, e) => {
          const slides = $res(e).attr('data-splide-lazy');
          if (slides) result.push(slides);
        });

        if (result.length > 0) {
          return {
            ok: true,
            type: 'image',
            result
          };
        }

      } catch (err) {
        if (attempt >= 10) throw err;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    return {
      ok: false,
      message: 'Failed to fetch data after 10 attempts.'
    };
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.response?.data || e.message || e
    };
  }
}