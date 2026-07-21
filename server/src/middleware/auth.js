import { pool } from '../db/pool.js';

export async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token ausente.' });
  }

  const result = await pool.query(
    `select s.token, s.expires_at, u.id, u.name, u.email, u.role
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

  req.auth = {
    token,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      isAdmin: session.role === 'admin'
    }
  };

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.auth?.user?.isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}
