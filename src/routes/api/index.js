// src/routes/api/index.js
import { Router } from 'express';


import ensureApiAuth from '../../middleware/ensureApiAuth.js';
import authApi from './auth.js';
import projectApi from './projects.js';
import taskApi from './tasks.js';
const router = Router();
// Example public ping
router.get('/ping', (_req, res) => res.json({ ok: true }));
// Public auth
router.use('/auth', authApi);
// Protected routes (JWT later)
router.use(ensureApiAuth);
router.use('/projects', projectApi);
router.use('/tasks', taskApi);

export default router;