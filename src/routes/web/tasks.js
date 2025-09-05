// src/routes/web/tasks.js
import { Router } from 'express';
import ensureAuth from '../../middleware/ensureAuth.js';
import requireProjectAccess from '../../middleware/requireProjectAccess.js';
import { create, updateStatus, assign, remove } from '../../controllers/taskController.js';

const router = Router();
router.use(ensureAuth);

router.post('/', requireProjectAccess, create);
router.post('/:id/status', updateStatus);
router.post('/:id/assign', assign);
router.post('/:id/delete', remove);

export default router;