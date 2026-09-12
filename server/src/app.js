const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimit');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const config = require('./config');

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: false, // SPA + inline map tiles; customize in production
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:5000', /\.e2b\.app$/],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.use('/api', routes);

// Server-side SEO (robots.txt, sitemap.xml, event-page head injection).
// Mounted BEFORE the SPA fallback so crawler requests receive real metadata.
app.use(require('./routes/seo.routes'));

// Serve built React client (production / single-port demo).
// Prefer the persistent build folder (server/web-static), fall back to client/dist.
const possibleClients = [
  path.join(__dirname, '..', 'web-static'),
  path.join(__dirname, '..', '..', 'client', 'dist'),
];
const clientDist = possibleClients.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res, next) => {
    const index = path.join(clientDist, 'index.html');
    if (fs.existsSync(index) && !req.path.includes('.')) return res.sendFile(index);
    return next();
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
