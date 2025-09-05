// src/middleware/requireProjectAccess.js
import Project from '../models/Project.js';

export default async (req, res, next) => {
  try {
    const userId = req.currentUser?._id;
    const projectId = req.params.projectId || req.params.id || req.body.project;
    if (!projectId) return res.status(400).send('Project id required');
    const project = await Project.findById(projectId).lean();
    if (!project) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Project not found');

    const isOwner = String(project.owner) === String(userId);
    const isMember = project.members.some((m) => String(m.user) === String(userId));
    const isAdmin = req.currentUser?.role === 'admin';

    if (isOwner || isMember || isAdmin) {
      req.project = project;
      return next();
    }
    return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
  } catch (e) {
    next(e);
  }
};