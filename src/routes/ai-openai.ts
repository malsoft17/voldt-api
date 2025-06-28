import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/openai';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { prompt } = req.query as { prompt: string };
    const data = await openAI(prompt);
    return reply.send(data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'OpenAI from prompt',
      tags: ['AI'],
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
      },
      parameters: [
        {
          name: 'prompt',
          in: 'query',
          required: true,
          schema: {
            type: 'string'
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

async function openAI(prompt: string) {
  try {
    if(!prompt) throw new Error('Parameter prompt is required');
    const url = 'https://chatbot-ji1z.onrender.com/chatbot-ji1z';

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Origin': 'https://seoschmiede.at',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3'
    }
  
    const { data } = await axios.post(url, `{"messages":[{"role":"user","content":"${prompt}"}]}`, { headers });
  
    return {
      ok: true,
      result: data.choices[0].message.content
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e.response?.data?.error || e.message
    }
  }
}