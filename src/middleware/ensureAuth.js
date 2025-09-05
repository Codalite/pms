// src/middleware/ensureAuth.js  (web: session)
export default (req, res, next) => {
  if (req.currentUser) return next();
  return res.redirect('/auth/login');
};