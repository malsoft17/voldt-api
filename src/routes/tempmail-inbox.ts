import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tempmail/inbox';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { address, limit } = req.query as {
      address: string;
      limit?: string;
    };

    const data = await getTempMailInbox(address, limit);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Melihat pesan masuk email sementara',
      tags: ['Temp Mail'],
      parameters: [
        {
          name: 'address',
          in: 'query',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            default: 20,
            minimum: 1,
            maximum: 100
          }
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
                  status: {
                    type: 'boolean'
                  },
                  author: {
                    type: 'string'
                  },
                  result: {
                    type: 'object',
                    properties: {
                      address: {
                        type: 'string'
                      },
                      count: {
                        type: 'integer'
                      },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object'
                        }
                      }
                    }
                  }
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

async function getTempMailInbox(address: string, limit?: string) {
  if(!address) {
    return {
      status: false,
      message: 'Parameter address wajib diisi'
    }
  }

  const parsedLimit = Math.min(
    Math.max(parseInt(limit || '20', 10) || 20, 1),
    100
  );

  try {
    const { data } = await axios.get(
      'https://www.keyrafara.com/tempmail/inbox',
      {
        params: {
          address,
          limit: parsedLimit
        },
        timeout: 15000,
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0'
        }
      }
    );

    if(!data?.status) {
      return {
        status: false,
        message: 'Api Website error hubungi owner'
      }
    }

    return data;
  } catch(e: any) {
    return {
      status: false,
      message: 'Api Website error hubungi owner'
    }
  }
}
