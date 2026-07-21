import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({
      status: 'ok',
      service: 'adrock-utm-builder-api',
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'adrock-utm-builder-api',
      database: 'disconnected',
      details: error instanceof Error ? error.message : 'unknown'
    });
  }
});

export default router;
