// src/controllers/taskController.js
import Task from '../models/Task.js';
import Project from '../models/Project.js';

export async function create(req, res) {
  const { project, title, description, dueDate, assignees, priority } = req.body;

  // Ensure requester has access to project
  const prj = await Project.findById(project).lean();
  if (!prj) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Project not found');

  const uid = req.currentUser._id;
  const isOwner = String(prj.owner) === String(uid);
  const isMember = prj.members.some((m) => String(m.user) === String(uid));
  const isAdmin = req.currentUser?.role === 'admin';
  if (!isOwner && !isMember && !isAdmin) {
    return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
  }

  const task = await Task.create({
    project,
    title,
    description,
    dueDate: dueDate || null,
    assignees: assignees ? [].concat(assignees) : [],
    priority: priority || 'medium',
    createdBy: uid
  });

  if (req.isApi) return res.status(201).json({ task });
  res.redirect(`/projects/${project}`);
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ task });
  res.redirect('back');
}

export async function assign(req, res) {
  const { assignees } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { assignees: [].concat(assignees || []) } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ task });
  res.redirect('back');
}

export async function remove(req, res) {
  const task = await Task.findById(req.params.id).lean();
  if (!task) return req.isApi ? res.status(404).json({ error: 'Task not found' }) : res.status(404).send('Not found');

  await Task.deleteOne({ _id: task._id });

  if (req.isApi) return res.status(204).end();
  res.redirect(`/projects/${task.project}`);
}