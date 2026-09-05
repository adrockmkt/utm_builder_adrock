import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { buildSetupStatus, canRunInitialSetup, loginRateLimitOptions } from '../security/publicSurface.js';
import { logAudit } from '../utils/audit.js';
import { createSessionExpiry, generateId, generateToken, hashPassword, verifyPassword } from '../utils/security.js';

const router = Router();

function readSetupToken(req) {
  return req.get('x-setup-token') || '';
}

router.get('/setup-status', async (req, res) => {
  const result = await pool.query('select count(*)::int as total from users');
  const userCount = result.rows[0].total;
  const setupAllowed = canRunInitialSetup({
    nodeEnv: env.nodeEnv,
    userCount,
    setupToken: env.setupToken,
    providedSetupToken: readSetupToken(req)
  }).allowed;

  res.json(buildSetupStatus({
    nodeEnv: env.nodeEnv,
    userCount,
    setupTokenConfigured: Boolean(env.setupToken),
    setupTokenProvided: setupAllowed
  }));
});

router.post('/setup', async (req, res) => {
  const countResult = await pool.query('select count(*)::int as total from users');
  const setupDecision = canRunInitialSetup({
    nodeEnv: env.nodeEnv,
    userCount: countResult.rows[0].total,
    setupToken: env.setupToken,
    providedSetupToken: readSetupToken(req)
  });
  if (!setupDecision.allowed) {
    return res.status(setupDecision.status).json({ error: setupDecision.error });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  const userId = generateId();
  const passwordHash = hashPassword(password);
  await pool.query(
    'insert into users (id, name, email, password_hash, role, status) values ($1, $2, $3, $4, $5, $6)',
    [userId, name.trim(), email.trim().toLowerCase(), passwordHash, 'admin', 'active']
  );
  await logAudit({
    req,
    actorUserId: userId,
    action: 'setup_admin_created',
    entityType: 'user',
    entityId: userId,
    metadata: { email: email.trim().toLowerCase() }
  });

  res.status(201).json({
    message: 'Administrador inicial criado com sucesso.'
  });
});

router.post('/login', rateLimit(loginRateLimitOptions), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const result = await pool.query(
    'select id, name, email, password_hash, role, status from users where email = $1',
    [email.trim().toLowerCase()]
  );

  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    await logAudit({
      req,
      action: 'login_failed',
      entityType: 'session',
      metadata: { email: email.trim().toLowerCase() }
    });
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Usuário inativo.' });
  }

  const token = generateToken();
  const expiresAt = createSessionExpiry();
  await pool.query(
    'insert into sessions (token, user_id, expires_at) values ($1, $2, $3)',
    [token, user.id, expiresAt]
  );
  await logAudit({
    req,
    actorUserId: user.id,
    action: 'login_success',
    entityType: 'session',
    entityId: token.slice(0, 12),
    metadata: { email: user.email, expiresAt }
  });

  res.json({
    token,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin'
    }
  });
});

router.get('/me', async (req, res) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token ausente.' });
  }

  const result = await pool.query(
    `select s.token, s.expires_at, u.id, u.name, u.email, u.role, u.status
     from sessions s
     join users u on u.id = s.user_id
     where s.token = $1`,
    [token]
  );

  const session = result.rows[0];
  if (!session) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await pool.query('delete from sessions where token = $1', [token]);
    return res.status(401).json({ error: 'Sessão expirada.' });
  }

  res.json({
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      isAdmin: session.role === 'admin'
    }
  });
});

router.post('/logout', async (req, res) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (token) {
    const result = await pool.query('delete from sessions where token = $1 returning user_id', [token]);
    await logAudit({
      req,
      actorUserId: result.rows[0]?.user_id || null,
      action: 'logout',
      entityType: 'session',
      entityId: token.slice(0, 12)
    });
  }

  res.json({ success: true });
});

export default router;
