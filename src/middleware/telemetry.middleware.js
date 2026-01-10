/**
 * Telemetry Middleware
 *
 * Captures request/response metadata for odds API monitoring.
 */

const { logRequest } = require('../services/telemetry.service');

function requestTelemetry(req, res, next) {
  const startTime = process.hrtime.bigint();
  let responseBody;

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const marketId = req.params?.id || null;
    const outcome = req.body?.outcome || null;
    const amount = req.body?.amount ? Number(req.body.amount) : null;
    const userId = req.user?.id || null;

    const responseMeta = responseBody && responseBody.success
      ? responseBody.data
      : undefined;

    const entry = {
      endpoint: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      duration_ms: Math.round(durationMs),
      market_id: marketId,
      user_id: userId,
      outcome,
      amount,
      error_code: responseBody?.error?.code || null,
      error_message: responseBody?.error?.message || null,
      request_meta: {
        query: req.query || {},
        body: outcome || amount ? { outcome, amount } : undefined
      },
      response_meta: responseMeta,
      ip: req.headers['x-forwarded-for'] || req.ip,
      user_agent: req.headers['user-agent']
    };

    logRequest(entry);
  });

  next();
}

module.exports = {
  requestTelemetry
};
