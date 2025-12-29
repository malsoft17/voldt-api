import axios from 'axios';
import { FastifyInstance } from 'fastify';
import { OpenAPIV3 } from 'openapi-types';

const path = '/api/ai/wormgpt';

const register = (fastify: FastifyInstance) => {
  fastify.get(path, async(req, reply) => {
    const { prompt } = req.query as { prompt: string };
    try {
      const res = await wormGpt.send({ message: prompt });
      if(!res) throw new Error('Tidak ada response');
      if ('result' in res && 'data' in res.result) {
        return reply.send({
          success: true,
          result: res.result.data
        });
      }
    } catch (e: any) {
      return reply.send({
        success: false,
        message: e.response?.data?.error || e.message
      });
    }
  });
}

const docs: OpenAPIV3.PathsObject = {
  [path]: {
    get: {
      summary: 'WormGPT from prompt',
      tags: ['AI'],
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

const wormGpt = {
  api: { 
    base: "http://145.79.11.101:5000", 
    endpoint: { 
      chat: "/api/chat"
    }
  },

  headers: {
    "user-agent": "NB Android/1.0.0",
    "accept": "*/*",
    "content-type": "application/json",
    "origin": "http://145.79.11.101:5000",
    "referer": "http://145.79.11.101:5000/"
  },

  conf: {
    retry: 2,
    failMax: 4,
    resetMs: 10000,
    respMax: 2 * 1024 * 1024,
    outMax: 8000,
    mode: "pretty"
  },

  stat: {
    fails: 0,
    until: 0
  },

  err: (msg: string, det = '') => ({
    success: false,
    code: 500,
    author: "Daffa ~",
    team: "NB Team",
    result: det ? { error: msg, detail: det } : { error: msg }
  }),

  ok: (res: Record<string, any>, ex = {}) => ({
    success: true,
    code: 200,
    author: "Daffa ~",
    team: "NB Team",
    result: res,
    ...ex
  }),

  clean: (i: string, m = '') => {
    if (typeof i !== "string") return "";
    m = m || wormGpt.conf.mode;

    let o = i.replace(/<span class="wormgpt-prefix">[^<]*<\/span>:/g, "");

    if (m === "minimal") return o.trim();
    if (m === "medium") return o.replace(/\s+$/g, "").trim();
    if (m === "strict")
      return o.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim();

    if (m === "pretty")
      return o
        .replace(/(#+\s.*)/g, "\n$1\n")
        .replace(/(\n|^)(\d+\.|\-|\*)\s+/g, "\n$2 ")
        .replace(/```/g, "\n```\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return o.trim();
  },

  send: async ({ message }: { message: string }) => {
    const t0 = Date.now();

    if (wormGpt.stat.until && wormGpt.stat.until < Date.now() - 60000)
      wormGpt.stat.until = 0;
    
    if (!message || typeof message !== "string" || !message.trim())
      return wormGpt.err("Inputnya mana??");

    if (Date.now() < wormGpt.stat.until)
      return wormGpt.err("Breaker On!!", "Kebanyakan error bree, coba lagi nanti ae yakk...");

    const payload = { message: message.trim().slice(0, 3000) };

    for (let tr = 1; tr <= wormGpt.conf.retry; tr++) {
      try {
        const r = await axios.post(
          wormGpt.api.base + wormGpt.api.endpoint.chat,
          payload,
          {
            headers: wormGpt.headers,
            timeout: 0,
            maxContentLength: wormGpt.conf.respMax,
            validateStatus: () => true
          }
        );

        if (typeof r.status === "number" && r.status >= 400) {
          wormGpt.stat.fails++;
          if (wormGpt.stat.fails >= wormGpt.conf.failMax)
            wormGpt.stat.until = Date.now() + wormGpt.conf.resetMs;

          if (tr === wormGpt.conf.retry)
            return wormGpt.err("Server Error", `${r.statusText || "🤌🏻"}`);

          continue;
        }

        wormGpt.stat.fails = 0;

        const o = r && typeof r.data !== "undefined" ? r.data : null;
        let or = "";

        if (o && typeof o === "object" && typeof o.response === "string") {
          or = o.response;
        } else if (typeof o === "string") {
          or = o;
        }

        or = or.slice(0, wormGpt.conf.outMax);

        let res = "";
        try {
          res = wormGpt.clean(or || "");
        } catch {
          res = (or || "").slice(0, wormGpt.conf.outMax);
        }

        return wormGpt.ok(
          { data: res }
        );

      } catch (e: any) {
        wormGpt.stat.fails++;

        if (wormGpt.stat.fails >= wormGpt.conf.failMax)
          wormGpt.stat.until = Date.now() + wormGpt.conf.resetMs;

        if (tr === wormGpt.conf.retry)
          return wormGpt.err("Error", e.message || String(e));
      }
    }
  }
};