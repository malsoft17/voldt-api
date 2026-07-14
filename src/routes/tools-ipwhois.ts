import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tools/ipwhois';

const register = (fastify: FastifyInstance) => {
  
  fastify.get<{
    Querystring: {
      ip?: string;
    }
  }>(path, async (req, reply) => {
    const { ip } = req.query;
    
    const data = await getIpInfo(ip);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Lacak Informasi IP (IP Whois)',
      tags: ['Tools'],
      parameters: [
        {
          name: 'ip',
          in: 'query',
          description: 'Masukkan IP Address. Kosongkan untuk melacak IP milikmu.',
          required: false,
          schema: { type: 'string' }
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
                  success: { type: 'boolean' },
                  result: { type: 'object' }
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

async function getIpInfo(ip?: string) {
  try {
    const url = ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
    const { data } = await axios.get(url);
    
    if (!data.success) {
      return {
        success: false,
        message: data.message || 'Gagal melacak IP.'
      };
    }
  
    return {
      success: true,
      result: data
    };
    
  } catch (e: any) {
    return {
      success: false,
      message: e.response?.data?.message || e.message
    };
  }
}
