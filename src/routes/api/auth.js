// src/routes/api/auth.js
import { Router } from 'express';
import { register, login, refresh, me, logout } from '../../controllers/apiAuthController.js';
import ensureApiAuth from '../../middleware/ensureApiAuth.js';

const router = Router();
// Public
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected
router.get('/me', ensureApiAuth, me);
router.post('/logout', logout);

export default router;