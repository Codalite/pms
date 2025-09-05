// src/routes/web/auth.js
import { Router } from 'express';
import { showLogin, login, showRegister, register, logout } from '../../controllers/authController.js';
const router = Router();

router.get('/login', showLogin);
router.post('/login', login);
router.get('/register', showRegister);
router.post('/register', register);
router.post('/logout', logout);

export default router;