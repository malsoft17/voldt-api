
import { FastifyPluginAsync } from 'fastify';


interface GlmQuery {
  prompt: string;
  system?: string;
  temperature?: number;
}

const aiGlmRoute: FastifyPluginAsync = async (fastify) => {
  
  fastify.get<{ Querystring: GlmQuery }>('/ai/glm', async (request, reply) => {
    try {
      
      const { 
        prompt, 
        system = 'You are a helpful assistant.', 
        temperature = 0.7 
      } = request.query;

      if (!prompt) {
        return reply.code(400).send({ 
          status: false, 
          message: 'Parameter prompt wajib diisi!' 
        });
      }

     
      const apiUrl = new URL('https://api.siputzx.my.id/api/ai/glm47flash');
      apiUrl.searchParams.append('prompt', prompt);
      apiUrl.searchParams.append('system', system);
      apiUrl.searchParams.append('temperature', temperature.toString());

      
      const response = await fetch(apiUrl.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mengembalikan hasil JSON langsung ke user
      return reply.code(200).send(data);
      
    } catch (error: any) {
      console.error('Error fetching GLM AI API:', error);
      return reply.code(500).send({ 
        status: false, 
        message: error.message || 'Internal Server Error' 
      });
    }
  });
};

export default aiGlmRoute;
