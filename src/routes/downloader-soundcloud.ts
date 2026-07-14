import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';


const path = '/api/downloader/soundcloud';


const register = (fastify: FastifyInstance) => {
  
  fastify.get<{
    Querystring: {
      url: string;
    }
  }>(path, async (req, reply) => {
    const { url } = req.query;
    
    
    if (!url) {
      return reply.code(400).send({
        success: false,
        message: 'Parameter url wajib diisi!'
      });
    }

    const data = await scdl(url);
    return reply.send(data);
  });
};


const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'SoundCloud Downloader',
      tags: ['Downloader'], 
      parameters: [
        {
          name: 'url',
          in: 'query',
          description: 'Link lagu dari SoundCloud (Contoh: https://soundcloud.com/user/judul-lagu)',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Berhasil mengambil link download',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  result: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      uploader: { type: 'string' },
                      duration: { type: 'string' },
                      views: { type: 'string' },
                      likes: { type: 'string' },
                      thumbnail: { type: 'string' },
                      size: { type: 'string' },
                      format: { type: 'string' },
                      download_url: { type: 'string' }
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


async function scdl(url: string) {
  const base = 'https://convertico.com/';
  const endpoint = base + 'soundcloud-downloader/soundcloud-downloader.php';

  const headers = {
    'accept': '*/*',
    'origin': base,
    'referer': base + 'soundcloud-downloader/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    
    const responseInfo = await axios.post(endpoint, new URLSearchParams({
      action: 'fetch',
      url: url
    }).toString(), { 
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' } 
    });

    const info = responseInfo.data;
    if (!info.status) throw new Error("Gagal mengambil info lagu, pastikan link valid.");

    
    const responseDl = await axios.post(endpoint, new URLSearchParams({
      action: 'download',
      url: url,
      quality: '192',
      is_playlist: '0'
    }).toString(), { 
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' } 
    });

    const dl = responseDl.data;
    if (!dl.file_url) throw new Error("Gagal melakukan generate link download.");

   
    const downloadUrl = base + 'soundcloud-downloader/' + dl.file_url.split('/').map(encodeURIComponent).join('/');

    return {
      success: true,
      result: {
        title: info.title,
        uploader: info.author,
        duration: `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}`,
        views: info.view_count.toLocaleString(),
        likes: info.like_count.toLocaleString(),
        thumbnail: info.thumbnail,
        size: `${(dl.size / 1024 / 1024).toFixed(2)} MB`,
        format: dl.format,
        download_url: downloadUrl
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan saat memproses link SoundCloud.'
    };
  }
}
