import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/Glm 4.7 Flash';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async (req, reply) => {
    const { prompt, system, temperature } = req.query as { 
      prompt: string; 
      system?: string; 
      temperature?: string; 
    };
    
    const data = await glmAI(prompt, system, temperature);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'GLM 4.7 Flash AI',
      tags: ['AI'],
      parameters: [
        {
          name: 'prompt',
          in: 'query',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'system',
          in: 'query',
          required: false,
          schema: { type: 'string', default: 'You are a helpful assistant.' }
        },
        {
          name: 'temperature',
          in: 'query',
          required: false,
          schema: { type: 'string', default: '0.7' }
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
                  status: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      response: { type: 'string' }
                    }
                  },
                  timestamp: { type: 'string' }
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
};

async function glmAI(prompt: string, system: string = 'You are a helpful assistant.', temperature: string = '0.7') {
  try {
    if (!prompt) throw new Error('Parameter prompt is required');
    
    const url = 'https://api.siputzx.my.id/api/ai/glm47flash';
    
    const { data } = await axios.get(url, {
      params: {
        prompt,
        system,
        temperature
      }
    });
  
    return data;
    
  } catch (e: any) {
    return {
      status: false,
      message: e.response?.data?.error || e.message
    };
  }
}
