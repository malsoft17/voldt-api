import axios from 'axios';
import crypto from 'crypto';
import file_type from 'file-type';
import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/img2img';

const register = (fastify: FastifyInstance) => {
  fastify.post<{
    Body: {
      image: MultipartFile;
      prompt?: { value: string };
    }
  }>(path, async(req, reply) => {
    const body = req.body;
    const file = body.image;
    const prompt = body.prompt?.value;

    if(!file) return reply.code(400).send({
      success: false,
      message: 'No file uploaded'
    });

    if(file.fieldname !== 'image') return reply.code(400).send({
      success: false,
      message: `Expected field 'image', got '${file.fieldname}'`
    });

    if(!prompt) return reply.code(400).send({
      success: false,
      message: 'Parameter prompt is required'
    });

    if(!file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') return reply.code(400).send({
      success: false,
      message: `Uploaded file must be an image, received type '${file.mimetype}'`
    });

    const buffer = await file.toBuffer();
    const data = await img2img(prompt, buffer);

    if(!data.success && !data.result) return reply.code(500).send(data);

    const { data: imageBuffer } = await axios.get(data.result, {
      responseType: 'arraybuffer'
    });

    return reply.type('image/png').send(imageBuffer);
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    post: {
      summary: 'Edit an image based on prompt',
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
                },
                prompt: {
                  type: 'string',
                  default: ''
                }
              },
              required: ['image', 'prompt']
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
                format: 'binary'
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

function decryptData(base64Data: string, uploadKey: string) {

  const raw = Buffer.from(base64Data, 'base64');

  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);

  const key = crypto
    .createHash("sha256")
    .update(uploadKey)
    .digest();

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

function generateImageId(input: Buffer) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");

  return [
    hash.slice(0,8),
    hash.slice(8,12),
    hash.slice(12,16),
    hash.slice(16,20),
    hash.slice(20,32)
  ].join("-");
}

function buildOssAuth({
  method,
  contentType,
  date,
  resource,
  securityToken,
  accessKeyId,
  accessKeySecret
}: {
  method: string,
  contentType: string,
  date: string,
  resource: string,
  securityToken: string,
  accessKeyId: string,
  accessKeySecret: string
}) {

  const canonicalHeaders =
    `x-oss-date:${date}\n` +
    `x-oss-security-token:${securityToken}\n`;

  const stringToSign =
    `${method}\n` +
    `\n` +
    `${contentType}\n` +
    `${date}\n` +
    `${canonicalHeaders}` +
    `${resource}`;

  const signature = crypto
    .createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64");

  return `OSS ${accessKeyId}:${signature}`;
}

async function img2img(prompt: string, imageBuffer: Buffer) {
  try {
    if (!prompt) throw new Error('Parameter prompt is required');
    if (!imageBuffer) throw new Error('Parameter imageBuffer is required');

    const secretKey = 'nc_ng_ai_image';
    const uploadKey = 'nc_c4c6ac3ad4c111f0a02fb38bea80bbf8';
    const timestamp = Math.floor(Date.now() / 1000);

    const cookies = generateCookies().cookieString;
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

    const headers = {
      'cookie': cookies,
      'User-Agent': userAgent,
      'X-Forwarded-For': ip
    };

    const sign = crypto
      .createHmac('sha256', uploadKey)
      .update(`t=${timestamp}`)
      .digest('hex')

    const stsRes = await axios.get(`https://notegpt.io/api/v1/oss/sts-token-enc?t=${timestamp}&sign=${sign}`, {
      headers
    });
    const encData = stsRes.data.data;
    const deEncData = JSON.parse(decryptData(encData, uploadKey));
    
    const imageId = generateImageId(imageBuffer);
    const date = new Date().toUTCString();

    const fileType = await file_type.fromBuffer(imageBuffer);
    const ext = fileType?.ext || 'png';
    const mime = fileType?.mime || 'image/png';

    const resource = `/nc-cdn/notegpt/web3in1/${imageId}.${ext}`;

    const auth = buildOssAuth({
      method: 'PUT',
      contentType: mime,
      date,
      resource,
      securityToken: deEncData.SecurityToken,
      accessKeyId: deEncData.AccessKeyId,
      accessKeySecret: deEncData.AccessKeySecret
    });
    
    const uploadRes = await axios.put(`https://nc-cdn.oss-us-west-1.aliyuncs.com/notegpt/web3in1/${imageId}.${ext}`,
      imageBuffer,
    {
      headers: {
        'Content-Type': mime,
        'x-oss-date': date,
        'X-Oss-Security-Token': deEncData.SecurityToken,
        'Authorization': auth,
      }
    });

    let imageUrl;
    if (uploadRes.status === 200) imageUrl = `https://nc-cdn.oss-us-west-1.aliyuncs.com/notegpt/web3in1/${imageId}.${ext}`;
    else throw new Error('Could not upload image');
    
    const payload = {
      aspect_ratio: 'match_input_image',
      image_urls: [imageUrl],
      model: '',
      num: 1,
      resolution: '2k',
      sub_type: 3,
      t: timestamp,
      type: 60,
      upscale: 2,
      user_prompt: prompt
    };
    const signature = generateSign(payload, secretKey);

    const res = await axios.post('https://notegpt.io/api/v2/images/start', {
      ...payload,
      sign: signature
    }, {
      headers
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
        headers
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

    if (data.data.results?.[0]?.url && data.data.status !== 'failed') {
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