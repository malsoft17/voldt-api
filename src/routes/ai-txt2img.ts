import axios from 'axios';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/txt2img';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { prompt } = req.query as { prompt: string };
    const data = await txt2img(prompt);

    if (!data || !data.result) {
      return reply.send(data);
    }

    const res = await axios.get(data.result, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
     });

    const contentType = res.headers['content-type'];
    if (!contentType) {
      return reply.send({
        success: false,
        message: 'Invalid image response'
      });
    }

    return reply
      .type(contentType.toString())
      .send(res.data);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Create an image from prompt',
      tags: ['AI'],
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

  return {
    obj: {
      anonymous_user_id,
      "sbox-guid": sbox_guid,
      [`crisp-client/session/${crispId}`]: sessionId,
      g_state: JSON.stringify(g_state)
    },
    cookieString: [
      `anonymous_user_id=${anonymous_user_id}`,
      `sbox-guid=${sbox_guid}`,
      `crisp-client/session/${crispId}=${sessionId}`,
      `g_state=${JSON.stringify(g_state)}`
    ].join('; ')
  };
}

function generateSign(data: Record<string, any>, secretKey: string) {
  const sortedKeys = Object.keys(data).sort();

  const queryString = sortedKeys.map(key => {
    const val = data[key];
    if (Array.isArray(val)) {
      const content = val.length > 0 ? val.map(c => `'${c}'`).join(", ") : "";
      return `${key}=[${content}]`;
    }
    return `${key}=${val}`;
  }).join('&');

  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

function sleep(ms: number) {
  return new Promise(a => setTimeout(a, ms));
}

async function txt2img(prompt: string) {
  try {
    if(!prompt) throw new Error('Parameter prompt is required');

    const secretKey = "nc_ng_ai_image";
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
      app_id: 'notegpt_8c92b6',
      aspect_ratio: '9:16',
      image_urls: [],
      num: 1,
      resolution: '1k',
      sub_type: 19,
      t: timestamp,
      type: 60,
      user_prompt: prompt
    };

    const signature = generateSign(payload, secretKey);

    const cookies = generateCookies().cookieString;

    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const res = await axios.post('https://notegpt.io/api/v2/images/start', {
      ...payload,
      sign: signature
    }, {
      headers: {
        'cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'X-Forwarded-For': ip
      }
    });

    console.log({
      res: res.data,
      signature
    });

    if (!res?.data?.data?.session_id) {
      throw new Error('Could not retrieve session ID');
    }

    const sessionId = res.data.data.session_id;
    const url = `https://notegpt.io/api/v2/images/status?session_id=${sessionId}`;

    let data;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const response = await axios.get(url, {
        headers: {
          'cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'X-Forwarded-For': ip
        }
      });
      data = response.data;

      if (!data || !data.data) {
        throw new Error(`API Error: ${data?.message || 'Invalid response format'}`);
      }

      if (data.data.status !== 'processing') {
        break; 
      }

      await sleep(1000);
      attempts++;
    }

    if (data.data.results?.[0]?.url) {
      return {
        ok: true,
        result: data.data.results[0].url
      };
    } else {
      throw new Error(`Processing failed with status: ${data.data.status}`);
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data || e.message
    }
  }
}