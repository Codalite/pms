// src/app.js
import { config } from 'dotenv';
config();
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import cors from 'cors';

import connectDb from './config/db.js';
import configureNunjucks from './config/nunjucks.js';
import sessionMiddleware from './config/session.js';

import webAuthRoutes from './routes/web/auth.js';
import webProjectRoutes from './routes/web/projects.js';
import webTaskRoutes from './routes/web/tasks.js';

import apiRouter from './routes/api/index.js';

import currentUser from './middleware/currentUser.js';
import isApi from './middleware/isApi.js';
import errorHandler from './middleware/errorHandler.js';

// const dirname = path.join(new URL(import.meta.url).pathname, '..');
const {dirname ,filename}=import.meta
const app = express();


// DB
connectDb(process.env.MONGO_URI);

// Security & basics
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Views
const templatesDir = path.resolve(dirname, 'templates');
console.log("template dir:",templatesDir)
configureNunjucks(app, templatesDir);



// Sessions (web)
app.use(sessionMiddleware(process.env.MONGO_URI, process.env.SESSION_SECRET));

// Attach user to req/res.locals
app.use(currentUser);

// Static (optional place your assets)
app.use(express.static(path.join(dirname, '../public')));

// CSRF only for web (not API)
const webOnly = (req, _res, next) => (req.path.startsWith('/api') ? next() : csrf()(req, _res, next));
app.use(webOnly, (req, res, next) => {
  if (!req.path.startsWith('/api')) res.locals.csrfToken = req.csrfToken();
  next();
});

// Web routes
app.get('/', (_req, res) => res.redirect('/projects'));
app.use('/auth', webAuthRoutes);
app.use('/projects', webProjectRoutes);
app.use('/tasks', webTaskRoutes);

// API routes (CORS here only)
app.use('/api', cors({ origin: '*', credentials: false }), isApi, apiRouter);

// 404
app.use((req, res) => {
  if (req.isApi) return res.status(404).json({ error: 'Not found' });
  res.status(404).send('Not found');
});

// Errors
app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server on http://localhost:${process.env.PORT || 3000}`);
});