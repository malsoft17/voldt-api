import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { OpenAPIV3 } from 'openapi-types';
import axios from 'axios';
import FormData from 'form-data';

const path = '/api/tools/uploadfile';

const register = (fastify: FastifyInstance) => {
  fastify.post<{ Body: { file: MultipartFile } }>(path, async(req, reply) => {
    const body = req.body;
    const file = body.file;

    if(!file) return reply.code(400).send({
      success: false,
      message: 'No file uploaded'
    });

    const buffer = await file.toBuffer();
    const data = await catbox(buffer);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Convert file to file url',
      tags: ['Tools'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: {
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

async function catbox(buffer: Buffer) {
  try {
    if(!buffer) return {
      success: false,
      message: 'Parameter buffer is required'
    }; 

    if(!Buffer.isBuffer(buffer)) return {
      success: false,
      message: 'Parameter must be a buffer'
    };

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', buffer, {
      filename: Date.now() + '.bin'
    });

    const res = await axios.post('https://catbox.moe/user/api.php', formData);
    const data = res.data;

    return {
      success: true,
      result: data
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    };
  }
}