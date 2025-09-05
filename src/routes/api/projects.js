// src/routes/api/projects.js
import { Router } from 'express';
import requireProjectAccess from '../../middleware/requireProjectAccess.js';
import { list, show, create, update, remove, addMember } from '../../controllers/projectController.js';
const router = Router();

router.get('/', list);
router.get('/:id', requireProjectAccess, show);
router.post('/', create);
router.patch('/:id', requireProjectAccess, update);
router.delete('/:id', requireProjectAccess, remove);
router.post('/:id/members', requireProjectAccess, addMember);

export default router;