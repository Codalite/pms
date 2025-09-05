// src/middleware/errorHandler.js
export default (err, req, res, _next) => {
  console.error(err);
  if (req.isApi) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).send('Something went wrong');
};