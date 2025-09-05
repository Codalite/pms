// src/controllers/projectController.js
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

export async function list(req, res) {
  const uid = req.currentUser._id;
  const projects = await Project.find({
    $or: [{ owner: uid }, { 'members.user': uid }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (req.isApi) return res.json({ projects });
  res.render('projects/index', { projects });
}

export async function show(req, res) {
  const project = req.project || (await Project.findById(req.params.id).lean());
  if (!project) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Not found');

  const tasks = await Task.find({ project: project._id }).sort({ dueDate: 1 }).lean();

  if (req.isApi) return res.json({ project, tasks });
  res.render('projects/show', { project, tasks });
}

export function newForm(_req, res) { return res.render('projects/form', { project: null }); }

export async function create(req, res) {
  const owner = req.currentUser._id;
  const { name, description } = req.body;
  const project = await Project.create({ name, description, owner });

  if (req.isApi) return res.status(201).json({ project });
  res.redirect(`/projects/${project._id}`);
}

export async function editForm(req, res) {
  const project = await Project.findById(req.params.id).lean();
  if (!project) return res.status(404).send('Not found');
  res.render('projects/form', { project });
}

export async function update(req, res) {
  const { name, description } = req.body;
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: { name, description } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ project });
  res.redirect(`/projects/${req.params.id}`);
}

export async function remove(req, res) {
  await Project.findByIdAndDelete(req.params.id);
  if (req.isApi) return res.status(204).end();
  res.redirect('/projects');
}

export async function addMember(req, res) {
  const { email, role } = req.body;
  const user = await User.findOne({ email }).lean();
  if (!user) return req.isApi ? res.status(404).json({ error: 'User not found' }) : res.status(404).send('User not found');

  await Project.findByIdAndUpdate(req.params.id, {
    $addToSet: { members: { user: user._id, role: role || 'member' } }
  });

  if (req.isApi) return res.status(204).end();
  res.redirect(`/projects/${req.params.id}`);
}