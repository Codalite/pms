// src/config/jwt.js  (for later API use)
import jwt from 'jsonwebtoken';

export function sign(payload, secret) { return jwt.sign(payload, secret, { expiresIn: '7d' }); }
export function verify(token, secret) { return jwt.verify(token, secret); }