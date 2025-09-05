// src/middleware/requirePermission.js
import { project, task } from '../config/permissions.js';

const permissions = { project, task };


export default (resource, action) => {
  return (req, res, next) => {
    const role = req.currentUser?.role;
    const allowedRoles = permissions[resource]?.[action] || [];
    if (allowedRoles.includes(role)) {
      return next();
    }
    return req.isApi
      ? res.status(403).json({ error: 'Forbidden' })
      : res.status(403).send('Forbidden');
  };
};