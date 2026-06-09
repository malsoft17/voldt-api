import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/fun/cekkhodam';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { name } = req.query as { name: 'string' };
    const data = await cekKhodam(name);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'cek khodam lu',
      tags: ['Fun'],
      parameters: [
        {
          name: 'name',
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
                  result: { type: 'string' }
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

async function cekKhodam(name: string) {
  try {
    const apiUrl = `https://khodam.vercel.app/v2?nama=${name}&_rsc=1iwkq`;
    const { data } = await axios.get(apiUrl);
    const $ = cheerio.load(data);
    const res = $('.result p').last().text().trim().replace(/✨/g, '');
    return {
      success: true,
      result: res
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}