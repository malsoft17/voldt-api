import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/arting';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async (req, reply) => {
    const { prompt, model_id, negative_prompt, width, height } = req.query as { prompt: string, model_id: string, negative_prompt: string, width: number, height: number };
    const data = await artingAi(prompt, model_id, negative_prompt, Number(width), Number(height));
    const response = await axios.get(data.result, { responseType: 'arraybuffer' });
    reply.type('image/png').send(response.data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Create an AI Image from prompt (Arting AI)',
      tags: ['AI'],
      parameters: [
        {
          name: 'prompt',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            default: 'Badass man'
          }
        },
        {
          name: 'model_id',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: [
              'mistoonJade_v10Anime',
              'divineanimemix_V2',
              'animatedModelsOf_31',
              'cuteAnime_v10',
              'SDXLFaetastic_v24',
              'pastelMixPrunedFP16',
              'cyberrealisticSemi_v30',
              'cyberrealisticPony_v65',
              'divineelegancemix_V10',
              'maturemalemix_v14',
              'asyncsMIX_v7',
              'furworldFurry',
              'comicBabes_v2',
              'absolutereality_v181',
              'fuwafuwamix_v15BakedVae2',
              'ghostmix_v20Bakedvae',
            ],
            default: 'mistoonJade_v10Anime'
          }
        },
        {
          name: 'width',
          in: 'query',
          required: true,
          schema: {
            type: 'integer',
            minimum: 64,
            maximum: 2048,
            default: 1024
          }
        },
        {
          in: 'query',
          name: 'height',
          required: true,
          schema: {
            type: 'integer',
            minimum: 64,
            maximum: 2048,
            default: 1024
          }
        }
      ],
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

async function artingAi(prompt: string, model_id: string, negative_prompt: string, width: number, height: number) {
  try {
    if(!prompt) throw new Error('Parameter "prompt" is required');
    if(!width) throw new Error('Parameter "width" is required');
    if(!height) throw new Error('Parameter "height" is required');
    const form = JSON.stringify({
      prompt: prompt,
      model_id: model_id,
      samples: 1,
      height: height,
      width: width,
      negative_prompt: negative_prompt,
      seed: -1,
      lora_ids: '',
      lora_weight: '0.7',
      sampler: 'Euler a',
      steps: 25,
      guidance: 7,
      clip_skip: 2
    });
    const response = await axios.post('https://api.arting.ai/api/cg/text-to-image/create', form, {
      headers: {
        'content-type': 'application/json',
        'origin': 'https://arting.ai',
        'referer': 'https://arting.ai/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      }
    });

    for(let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const form2 = JSON.stringify({
        request_id: response.data.data.request_id
      });
      const response2 = await axios.post('https://api.arting.ai/api/cg/text-to-image/get', form2, {
        headers: {
          'content-type': 'application/json',
          'origin': 'https://arting.ai',
          'referer': 'https://arting.ai/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        }
      });
      if(response2.data.data.output.length) return {
        ok: true,
        result: response2.data.data.output[0]
      }
    }
    
    return {
      ok: false,
      result: 'Timeout has been reached'
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}