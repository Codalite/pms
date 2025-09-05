// src/middleware/currentUser.js
export default (req, res, next) => {
  const user = req.session?.user || req.user || null;
  req.currentUser = user;
  res.locals.currentUser = user;
  next();
};