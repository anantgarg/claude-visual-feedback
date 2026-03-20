const cors = require('cors');

const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowed =
      /^chrome-extension:\/\//.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

module.exports = corsMiddleware;
