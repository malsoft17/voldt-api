import axios from 'axios';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/gpt';

const register = (fastify: FastifyInstance) => {
  fastify.post<{
    Body: {
      prompt?: { value: string };
    }
  }>(path, async(req, reply) => {
    const body = req.body;
    const prompt = body.prompt?.value;

    if(!prompt) return reply.code(400).send({
      success: false,
      message: 'Parameter prompt is required'
    });

    const data = await gpt(prompt);
    return reply.send(data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Chat with GPT model',
      tags: ['AI'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  default: ''
                }
              },
              required: ['prompt']
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

const generateRandomHash = (len: number) => {
  return crypto.randomBytes(len).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

function generateCookies() {
  const now = Date.now();

  const anonymous_user_id = crypto.randomUUID();

  const sboxRaw = `${now}|${crypto.randomBytes(4).toString('hex')}`;
  const sbox_guid = Buffer.from(sboxRaw).toString('base64');

  const crispId = crypto.randomUUID();
  const sessionId = `session_${crypto.randomUUID()}`;

  const g_state = {
    i_l: 0,
    i_ll: now + Math.floor(Math.random() * 5000),
    i_b: generateRandomHash(32),
    i_e: {
      enable_itp_optimization: 0
    }
  };

  return [
    `anonymous_user_id=${anonymous_user_id}`,
    `sbox-guid=${sbox_guid}`,
    `crisp-client/session/${crispId}=${sessionId}`,
    `g_state=${JSON.stringify(g_state)}`
  ].join('; ');
}

async function gpt(prompt: string) {
  try {
    if (!prompt) throw new Error('Parameter prompt is required');

    const cookies = generateCookies();
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const payload = {
      'message': prompt,
      'language': 'auto',
      'model': 'gpt-5-mini',
      'tone': 'default',
      'length': 'moderate',
      'conversation_id': crypto.randomUUID(),
      'image_urls': [],
      'chat_mode': 'standard'
    };

    const res = await axios.post('https://notegpt.io/api/v2/chat/stream', payload, {
      headers: {
        'cookie': cookies,
        'x-forwarded-for': ip
      }
    });

    if (!res.data) throw new Error('Response data is empty');

    const raw = res.data;

    const lines = raw.split('\n');

    let result = '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.replace('data: ', '').trim();

        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.text) {
            result += parsed.text;
          }
        } catch {}
      }
    }

    return {
      success: true,
      result
    }

  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data || e.message
    }
  }
}