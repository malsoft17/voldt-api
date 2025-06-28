import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tools/uploadimage';

const register = (fastify: FastifyInstance) => {
  fastify.post(path, async(req, reply) => {
    const file = await req.file();

    if(!file) return reply.code(400).send({
      ok: false,
      message: 'No file uploaded'
    });

    if(file.fieldname !== 'image') return reply.code(400).send({
      ok: false,
      message: `Expected field 'image', got '${file.fieldname}'`
    });

    if(!file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') return reply.code(400).send({
      ok: false,
      message: `Uploaded file must be an image, received type '${file.mimetype}'`
    });

    const buffer = await file.toBuffer();
    const data = await imgbb(buffer);
    return reply.send(data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Convert image to image url',
      tags: ['Tools'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  format: 'binary'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
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

async function imgbb(buffer: Buffer) {
  try {
    const { data: rawData } = await axios.get('https://imgbb.com');
    const $ = cheerio.load(rawData);

    const script = $('script')
      .map((i, el) => $(el).html())
      .get()
      .find(text => text && text.includes('auth_token'));

    const match = script?.match(/auth_token\s*[:=]\s*["']([a-zA-Z0-9]{32,})["']/);
    const token = match ? match[1] : null;

    const form = new FormData();
    form.append('source', buffer, {
      filename: Date.now() + '.jpg',
      contentType: 'image/jpeg'
    });
    form.append('type', 'file');
    form.append('action', 'upload');
    form.append('timestamp', Date.now());
    form.append('auth_token', token);

    const { data } = await axios.post('https://imgbb.com/json', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    return {
      ok: true,
      result: data.image.url
    }
  } catch (error: unknown) {
    const e = error as AxiosError<{ error: string }>;
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}