import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { generateId, hashPassword } from '../utils/security.js';
import { isValidUserRole } from '../utils/users.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireAdmin, async (_req, res) => {
  const result = await pool.query(
    'select id, name, email, role, status, created_at from users order by created_at desc'
  );

  res.json(result.rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nome, email, senha e perfil são obrigatórios.' });
  }
  if (!isValidUserRole(role)) {
    return res.status(400).json({ error: 'Perfil de usuário inválido.' });
  }

  const userId = generateId();
  await pool.query(
    'insert into users (id, name, email, password_hash, role, status) values ($1, $2, $3, $4, $5, $6)',
    [userId, name.trim(), email.trim().toLowerCase(), hashPassword(password), role, 'active']
  );
  await logAudit({
    req,
    action: 'user_created',
    entityType: 'user',
    entityId: userId,
    metadata: { email: email.trim().toLowerCase(), role }
  });

  res.status(201).json({ id: userId });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;
  const normalizedEmail = email === undefined ? null : String(email).trim().toLowerCase();

  if (email !== undefined && !normalizedEmail) {
    return res.status(400).json({ error: 'Email obrigatório.' });
  }
  if (role !== undefined && !isValidUserRole(role)) {
    return res.status(400).json({ error: 'Perfil de usuário inválido.' });
  }

  if (normalizedEmail) {
    const existing = await pool.query('select id from users where email = $1 and id <> $2', [normalizedEmail, id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe outro usuário com este email.' });
    }
  }

  await pool.query(
    `update users
     set name = coalesce($2, name),
         email = coalesce($3, email),
         role = coalesce($4, role),
         status = coalesce($5, status)
     where id = $1`,
    [id, name?.trim(), normalizedEmail, role, status]
  );
  await logAudit({
    req,
    action: 'user_updated',
    entityType: 'user',
    entityId: id,
    metadata: { name: name?.trim(), email: normalizedEmail, role, status }
  });

  res.json({ success: true });
});

router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || String(password).trim().length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }

  await pool.query('update users set password_hash = $2 where id = $1', [id, hashPassword(String(password).trim())]);
  await logAudit({
    req,
    action: 'user_password_reset',
    entityType: 'user',
    entityId: id
  });
  res.json({ success: true });
});

export default router;
