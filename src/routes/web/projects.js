// src/routes/web/projects.js
import { Router } from 'express';

const router =Router();

import ensureAuth from '../../middleware/ensureAuth.js';
import requireProjectAccess from '../../middleware/requireProjectAccess.js';
import requirePermission from '../../middleware/requirePermission.js';
import { list, newForm, create, show, editForm, update, remove, addMember } from '../../controllers/projectController.js';

router.use(ensureAuth);

router.get('/', list);
router.get('/new', requirePermission('project', 'create'), newForm);
router.post('/', requirePermission('project', 'create'), create);

router.get('/:id', requireProjectAccess, show);
router.get('/:id/edit', requireProjectAccess, requirePermission('project', 'update'), editForm);
router.post('/:id', requireProjectAccess, requirePermission('project', 'update'), update);
router.post('/:id/delete', requireProjectAccess, requirePermission('project', 'delete'), remove);
router.post('/:id/members', requireProjectAccess, requirePermission('project', 'addMember'), addMember);

export default router;