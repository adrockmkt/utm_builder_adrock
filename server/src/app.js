import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { ensureSchema } from './db/init.js';
import auditLogRoutes from './routes/auditLogs.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import exportRoutes from './routes/exports.js';
import healthRoutes from './routes/health.js';
import settingsRoutes from './routes/settings.js';
import slackRoutes from './routes/slack.js';
import userRoutes from './routes/users.js';
import utmCampaignRoutes from './routes/utmCampaigns.js';
import utmLinkRoutes from './routes/utmLinks.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: false }));
app.use(rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '4mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'Ad Rock UTM Builder API',
    mode: 'single-tenant',
    awsReady: true
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/utm-campaigns', utmCampaignRoutes);
app.use('/api/utm-links', utmLinkRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/exports', exportRoutes);

async function start() {
  await ensureSchema();

  app.listen(env.port, () => {
    console.log(`UTM Builder API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start UTM Builder API', error);
  process.exit(1);
});
