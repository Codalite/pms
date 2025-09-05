// src/middleware/ensureApiAuth.js  (api: JWT later)
import { verify } from '../config/jwt.js';

export default (req, res, next) => {
  
  const hdr = req.headers.authorization || '';
const parts = hdr.split(' ');

if (parts.length !== 2 || parts[0] !== 'Bearer') {
  return res.status(401).json({ error: 'Unauthorized' });
}

const token = parts[1];
if (!token) return res.status(401).json({ error: 'Unauthorized' });

try {
  const payload = verify(token, process.env.JWT_SECRET);
  req.user = payload;
  req.currentUser = payload;
  return next();
} catch {
  return res.status(401).json({ error: 'Unauthorized' });
}
};