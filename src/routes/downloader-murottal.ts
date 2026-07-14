import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/downloader/murottal';

const register = (fastify: FastifyInstance) => {
  
  fastify.get<{
    Querystring: {
      search?: string;
    }
  }>(path, async (req, reply) => {
    const { search } = req.query;
    
    
    const data = await getMurottal(search);
    return reply.send(data);
  });
};

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'Download Murottal (Islamipedia)',
      tags: ['Downloader'],
      parameters: [
        
        {
          name: 'search',
          in: 'query',
          description: 'Cari nama surah (contoh: fatihah). Jika dikosongkan, maka get all surah.',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Berhasil mengambil data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  result: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        audio_url: { type: 'string' }
                      }
                    }
                  },
                  message: { type: 'string' }
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

async function getMurottal(searchQuery?: string) {
  try {
    const targetUrl = 'https://islamipedia.id/murottal/';
    const { data: html } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const regex = /href=["']([^"']+\.mp3)["']/gi;
    let match;
    const results = [];

    while ((match = regex.exec(html)) !== null) {
      let audioUrl = match[1];

      if (audioUrl.startsWith('/')) {
        audioUrl = 'https://islamipedia.id' + audioUrl;
      } else if (!audioUrl.startsWith('http')) {
        audioUrl = targetUrl + audioUrl;
      }

      let title = audioUrl.substring(audioUrl.lastIndexOf('/') + 1).replace('.mp3', '');
      title = decodeURIComponent(title).replace(/-/g, ' ');

      results.push({
        title: title,
        audio_url: audioUrl
      });
    }

    if (results.length === 0) {
      return {
        success: false,
        message: 'woila cok file mp3 tidak ditemukan.'
      };
    }

    
    let finalResults = results.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.audio_url === value.audio_url
      ))
    );


    if (searchQuery) {
      finalResults = finalResults.filter((item) => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      
      if (finalResults.length === 0) {
        return {
          success: false,
          message: `Surah dengan kata kunci '${searchQuery}' tidak ditemukan.`
        };
      }
    }

    return {
      success: true,
      result: finalResults
    };

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Gagal mengakses website Islamipedia'
    };
  }
}
