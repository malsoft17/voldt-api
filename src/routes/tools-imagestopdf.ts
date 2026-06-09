import axios from 'axios';
import { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tools/imagestopdf';

const register = (fastify: FastifyInstance) => {
  fastify.post(path, async(req, reply) => {
    const parts = req.parts();
    const buffers: Buffer[] = [];

    for await(const part of parts) {
      if(part.type !== 'file' || part.fieldname !== 'images') return reply.code(400).send({
        success: false,
        message: `Expected field 'image', got '${part.fieldname}'`
      });
  
      if(!part.mimetype.startsWith('image/') || part.mimetype === 'image/gif') return reply.code(400).send({
        success: false,
        message: `Uploaded file must be an image, received type '${part.mimetype}'`
      });

      const buffer = await part.toBuffer();
      buffers.push(buffer);
    }

    if(buffers.length === 0) return reply.send({
      success: false,
      message: 'No images uploaded'
    });

    const data = await imageToPdf(buffers);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Convert images to PDF',
      tags: ['Tools'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                images: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'binary'
                  }
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

async function imageToPdf(buffers: Buffer[]) {
  try {
    const files = [];

    for(const [i, buffer] of buffers.entries()) {
      const form = new FormData();
      form.append('file', buffer, `image${i}.jpg`);

      const response = await axios.post('https://filetools1.pdf24.org/client.php?action=upload', form, {
        headers: form.getHeaders()
      });

      files.push(response.data[0]);
    }
    
    const form = {
      files,
      rotations: new Array(files.length).fill(0),
      joinFiles: true,
      createBookmarks: false,
      pageSize: 'A4',
      pageOrientation: 'auto',
      margin: '0'
    };

    const response = await axios.post('https://filetools1.pdf24.org/client.php?action=imagesToPdf', form);

    return {
      success: true,
      result: `https://filetools1.pdf24.org/client.php?mode=download&action=downloadJobResult&jobId=${response.data.jobId}`
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.error || e.message
    };
  }
}