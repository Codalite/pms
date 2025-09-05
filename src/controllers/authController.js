// src/controllers/authController.js
import User from '../models/User.js';

export function showLogin(_req, res) { return res.render('auth/login.html'); }

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).render('auth/login.html', { error: 'Invalid credentials' });
  }
  req.session.user = { _id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  res.redirect('/projects');
}

export function showRegister(_req, res) { return res.render('auth/register.html'); }

export async function register(req, res) {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).render('auth/register.html', { error: 'Email already in use' });
  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash });
  res.redirect('/auth/login');
}

export function logout(req, res) {
  req.session.destroy(() => res.redirect('/auth/login'));
}