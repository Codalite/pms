// src/routes/api/tasks.js
import { Router } from 'express';
import requireProjectAccess from '../../middleware/requireProjectAccess.js';
import requirePermission from '../../middleware/requirePermission.js';
import { create, updateStatus, assign, remove } from '../../controllers/taskController.js';

const router = Router();
router.post('/', requireProjectAccess, requirePermission('task', 'create'), create);
router.patch('/:id/status', requirePermission('task', 'update'), updateStatus);
router.patch('/:id/assign', requirePermission('task', 'assign'), assign);
router.delete('/:id', requirePermission('task', 'delete'), remove);

export default router;