import type { FastifyInstance } from 'fastify';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/downloader/aio';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { url } = req.query as { url: string };
    const data = await squidlr(url);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Social Media Video Downloader (X, Twitter, Instagram, Facebook, TikTok, LinkedIn)',
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

async function squidlr(url: string) {
  try {
    if(!url) throw new Error('Parameter url is required');
    const { data } = await axios.get(`https://www.squidlr.com/download?url=${encodeURIComponent(url)}`);
    const $ = cheerio.load(data);
    const title = $('p.content-text').text().trim();
    const author = $('footer.blockquote-footer').text().trim().split('\n')[0];
    let views,
      likes;
    $('li.list-inline-item').each((_, e) => {
      const small = $(e).find('small').text().trim();
      const value = $(e).find('strong').text().trim();
      if(small === 'Views') views = value;
      if(small === 'Likes') likes = value;
    });
    const uploadDate = $('time').text().trim();
    const duration = $('.card-text li.list-inline-item').eq(0).text().trim();
    const link = $('.list-group a').attr('href');
    return {
      ok: true,
      result: {
        title: title || 'Unknown',
        author: author || 'Unknown',
        views: views || 'Unknown',
        likes: likes || 'Unknown',
        uploadDate: uploadDate || 'Unknown',
        duration: duration || 'Unknown',
        link: link || 'Unknown'
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.response?.data || e.message || e
    }
  }
}
