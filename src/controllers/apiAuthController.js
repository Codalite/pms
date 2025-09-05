// src/controllers/apiAuthController.js
import User from '../models/User.js';
import { sign, verify } from '../config/jwt.js';
import { randomBytes } from 'crypto';

const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP_DAYS = 7;

function generateAccessToken(user) {
  return sign({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
}

function generateRefreshToken() {
  return randomBytes(40).toString('hex');
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: 'Email already in use' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  res.status(201).json({
    accessToken,
    refreshToken,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  res.json({
    accessToken,
    refreshToken,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role }
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

  const stored = user.refreshTokens.find(rt => rt.token === refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const accessToken = generateAccessToken(user);
  res.json({ accessToken });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();
  }
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: req.currentUser });
}