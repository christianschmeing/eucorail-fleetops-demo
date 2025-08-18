import fp from 'fastify-plugin';

export default fp(async (app) => {
  const enable =
    process.env.PREVIEW_ENABLE_AUTH === '1' &&
    !!process.env.PREVIEW_BASIC_USER &&
    !!process.env.PREVIEW_BASIC_PASS;
  if (!enable) return;
  const user = String(process.env.PREVIEW_BASIC_USER);
  const pass = String(process.env.PREVIEW_BASIC_PASS);
  const exempt = new Set(['/api/health', '/docs', '/docs/json', '/docs/yaml']);
  app.addHook('onRequest', async (req, reply) => {
    try {
      if (exempt.has(req.url) || req.url.startsWith('/docs') || req.url.startsWith('/health'))
        return;
      const hdr = req.headers['authorization'] || '';
      if (!hdr.startsWith('Basic ')) {
        reply.header('www-authenticate', 'Basic realm="preview"');
        return reply.code(401).send({ error: 'unauthorized' });
      }
      const b64 = hdr.slice(6);
      const [u, p] = Buffer.from(b64, 'base64').toString('utf-8').split(':');
      if (u !== user || p !== pass) {
        reply.header('www-authenticate', 'Basic realm="preview"');
        return reply.code(401).send({ error: 'unauthorized' });
      }
    } catch {
      reply.header('www-authenticate', 'Basic realm="preview"');
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });
});
