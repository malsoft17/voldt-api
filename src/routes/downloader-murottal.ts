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
      summary: 'Download Murottal (Quran.com API)',
      tags: ['Downloader'],
      parameters: [
        {
          name: 'search',
          in: 'query',
          description: 'Cari nama surah (contoh: Fatihah). Kosongkan untuk daftar lengkap.',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Berhasil mengambil data murottal',
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
                        id: { type: 'number' },
                        title: { type: 'string' },
                        audio_url: { type: 'string' }
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

export default { path, register, docs };

async function getMurottal(searchQuery?: string) {
  try {
    
    const { data: quranData } = await axios.get('https://api.quran.com/api/v4/chapters');
    
    let results = quranData.chapters.map((chapter: any) => ({
      id: chapter.id,
      title: chapter.name_simple,
      audio_url: `https://verses.quran.com/Alafasy/mp3/${String(chapter.id).padStart(3, '0')}.mp3`
    }));

    
    if (searchQuery) {
      results = results.filter((item: any) => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (results.length === 0) {
        return { success: false, message: 'Surah tidak ditemukan.' };
      }
    }

    return {
      success: true,
      result: results
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Gagal mengambil data dari server Quran.'
    };
  }
}
