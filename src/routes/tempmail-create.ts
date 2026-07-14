import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/tempmail/create';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const data = await createTempMail();
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Membuat alamat email sementara',
      tags: ['Temp Mail'],
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
                      username: {
                        type: 'string'
                      },
                      domain: {
                        type: 'string'
                      },
                      expiresAt: {
                        type: 'string'
                      },
                      inboxUrl: {
                        type: 'string'
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

async function createTempMail() {
  try {
    const { data } = await axios.get(
      'https://www.keyrafara.com/tempmail/create',
      {
        timeout: 15000,
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0'
        }
      }
    );

    if(!data?.status || !data?.result?.address) {
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
