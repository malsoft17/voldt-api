import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { OpenAPIV3 } from 'openapi-types';
import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const path = '/api/tools/uploadimagev2';

const register = (fastify: FastifyInstance) => {
  fastify.post<{ Body: { image: MultipartFile } }>(path, async(req, reply) => {
    const body = req.body;
    const file = body.image;

    if(!file) return reply.code(400).send({
      success: false,
      message: 'No file uploaded'
    });

    if(file.fieldname !== 'image') return reply.code(400).send({
      success: false,
      message: `Expected field 'image', got '${file.fieldname}'`
    });

    if(!file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') return reply.code(400).send({
      success: false,
      message: `Uploaded file must be an image, received type '${file.mimetype}'`
    });

    const buffer = await file.toBuffer();
    const data = await imgur(buffer);
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

async function imgur(image: Buffer) {
  try {
    if (!image) throw new Error('Parameter image is required!');

    const url = 'https://api.imgur.com/3/upload?client_id=d70305e7c3ac5c6';

    const fileType = await fileTypeFromBuffer(image);

    const formData = new FormData();
    const baseName = Date.now();
    formData.append('image', image, {
      filename: `${baseName}.${fileType?.ext}`,
      contentType: fileType?.mime
    });
    formData.append('type', 'file');
    formData.append('name', `${baseName}.${fileType?.ext}`);

    const res = await axios.post(url, formData);
    if (!res.data.success) throw new Error('Error when trying to get data');

    return {
      success: true,
      result: res.data?.data?.link || ''
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data || e.message
    };
  }
}