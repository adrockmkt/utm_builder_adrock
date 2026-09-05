import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const status = await getHealthStatus();
  res.status(status.status === 'ok' ? 200 : 500).json(toPublicHealthResponse(status));
});

router.get('/details', requireAuth, async (_req, res) => {
  const status = await getHealthStatus();
  res.status(status.status === 'ok' ? 200 : 500).json(toPrivateHealthResponse(status));
});

async function getHealthStatus() {
  try {
    await pool.query('select 1');
    const backup = await getLatestBackup();
    return {
      status: 'ok',
      database: 'connected',
      backup
    };
  } catch (error) {
    const backup = await getLatestBackup();
    return {
      status: 'error',
      database: 'disconnected',
      backup,
      details: error instanceof Error ? error.message : 'unknown'
    };
  }
}

export function toPublicHealthResponse(status) {
  return {
    status: status.status,
    service: 'adrock-utm-builder-api'
  };
}

export function toPrivateHealthResponse(status) {
  return {
    status: status.status,
    service: 'adrock-utm-builder-api',
    database: status.database,
    backup: status.backup
  };
}

async function getLatestBackup() {
  try {
    const files = await fs.readdir(env.backupDir);
    const dumpFiles = files.filter((file) => /^utm_builder-\d{8}-\d{6}\.dump$/.test(file));

    if (dumpFiles.length === 0) {
      return { status: 'pending', lastBackupAt: null, file: null };
    }

    const backups = await Promise.all(
      dumpFiles.map(async (file) => {
        const stats = await fs.stat(path.join(env.backupDir, file));
        return { file, mtimeMs: stats.mtimeMs, lastBackupAt: stats.mtime.toISOString() };
      })
    );
    backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const latest = backups[0];

    return {
      status: 'ok',
      lastBackupAt: latest.lastBackupAt,
      file: latest.file
    };
  } catch {
    return { status: 'unavailable', lastBackupAt: null, file: null };
  }
}

export default router;
