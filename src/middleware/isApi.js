// src/middleware/isApi.js
export default (req, _res, next) => {
  req.isApi = true;
  next();
};