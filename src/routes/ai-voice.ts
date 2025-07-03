import type { FastifyInstance } from 'fastify';
import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'qs';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/voice';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { text, language } = req.query as { text: string; language: string };
    const data = await aiVoiceGenerator(text, language);
    const { data: audioBuffer } = await axios.get(data.result, { responseType: 'arraybuffer' });
    return reply.type('audio/mpeg').send(audioBuffer);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Get AI Voice',
      tags: ['AI'],
      responses: {
        200: {
          description: 'OK',
          content: {
            'audio/mpeg': {
              schema: {
                type: 'string',
                default: 'Buffer'
              }
            }
          }
        }
      },
      parameters: [
        {
          name: 'text',
          in: 'query',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'language',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            default: 'en-US'
          }
        }
      ]
    }
  }
};

export default {
  path,
  register,
  docs
}

async function aiVoiceGenerator(text: string, language = 'en-US') {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    if(!text) throw new Error('Parameter text is required');
    if(!language) throw new Error('Parameter language is required');
    const html = await axios.get('https://aivoicegenerator.com/', {
      headers: {
        'user-agent': userAgent
      }
    })
    const cookie = (html.headers['set-cookie'] as string[]).map((v: string) => v.split(';')[0]).join('; ');
    const $ = cheerio.load(html.data);
    const csrf_test_name = $('input[name=csrf_test_name]').attr('value');
    const form = qs.stringify({
      csrf_test_name,
      front_tryme_language: language,
      front_tryme_voice: 'QObKyouBVf49fcda7e728e3b7f01158e4e5312774JvLByN4n0_standard',
      front_tryme_text: text
    });
    const { data } = await axios.post('https://aivoicegenerator.com/home/tryme_action/', form, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cookie': cookie,
        'origin': 'https://aivoicegenerator.com',
        'referer': 'https://aivoicegenerator.com/',
        'user-agent': userAgent
      }
    });
    return {
      success: true,
      result: data.tts_uri
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}