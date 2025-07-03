import type { FastifyInstance } from 'fastify';
import axios from 'axios';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/blackskin';

const register = (fastify: FastifyInstance) => {
  fastify.post(path, async(req, reply) => {
    const file = await req.file();

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
    const data = await blackSkin(buffer);

    if(!data.success) return reply.code(500).send(data);
    return reply.type('image/png').send(data.result);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Change character skin to black',
      tags: ['AI'],
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
            'image/png': {
              schema: {
                type: 'string',
                default: 'Buffer'
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

async function blackSkin(buffer: Buffer, filter = 'hitam'): Promise<{ success: true; result: Buffer } | { success: false; message: string }> {
  try {
    const imageData = Buffer.from(buffer).toString('base64');
  
    const { data } = await axios.post('https://negro.consulting/api/process-image', { imageData, filter });
  
    const base64Image = data.processedImageUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    return {
      success: true,
      result: imageBuffer
    }
  }
  catch(e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    }
  }
}