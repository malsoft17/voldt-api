import axios from 'axios';
import FormData from 'form-data';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';
import fileType from 'file-type';

const path = '/api/ai/imgupscaler';

const register = (fastify: FastifyInstance) => {
  fastify.post(path, async(req, reply) => {
    const file = await req.file();
    const { ratio } = req.query as { ratio: string };

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
    const data = await imageUpscaler(buffer, ratio);

    if(!data.ok) return reply.code(500).send(data);
    const { data: imageBuffer } = await axios.get(data.result.downloadUrls[0], {
      responseType: 'arraybuffer'
    });

    return reply.type(`image/${data.result.imagemimetype}`).send(imageBuffer);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Increase the quality of your image',
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

async function imageUpscaler(buffer: Buffer, ratio = '200%') {
  try {
    if(!buffer) throw new Error('Paramater "url" is required');
    if(!ratio) throw new Error('Parameter "ratio" is required');
    const theRatio = Number(ratio.replace('%', '')) / 100;

    const ext = ((await fileType.fromBuffer(buffer)) as Record<string, any>).ext;
    const form = new FormData();
    form.append('myfile', buffer, `${Date.now()}.${ext}`);
    form.append('scaleRadio', theRatio);
    const { data: uploadData } = await axios.post('https://get1.imglarger.com/api/UpscalerNew/UploadNew', form, {
      headers: {
        'content-type': 'multipart/form-data',
        'origin': 'https://imgupscaler.com',
        'referer': 'https://imgupscaler.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      }
    });
    if(uploadData.code !== 200 || uploadData.msg !== 'Success') throw new Error('Error while uploading file');
    const json = JSON.stringify({
      code: uploadData.data.code,
      scaleRadio: theRatio
    });
    let status = 'waiting';
    let finalData;
    while(status === 'waiting') {
      const { data: response } = await axios.post('https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew', json, {
        headers: {
          'content-type': 'application/json',
          'origin': 'https://imgupscaler.com',
          'referer': 'https://imgupscaler.com/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        }
      });
      finalData = response;
      status = finalData.data.status;
      await new Promise(r => setTimeout(r, 1000));
    }
    return {
      ok: true,
      result: finalData.data
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    };
  }
}