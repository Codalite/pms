// src/middleware/requireRole.js
export default (...allowed) => (req, res, next) => {
  const role = req.currentUser?.role;
  if (role && allowed.includes(role)) return next();
  return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
};