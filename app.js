import express, { json, urlencoded } from 'express';
import nunjucks from 'nunjucks';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
const __dirname = join(new URL(import.meta.url).pathname, '..');
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

var app = express();
app.set('view engine', 'html');

nunjucks.configure('templates', {
  autoescape: true,
  express: app, watch: true
});

app.use(logger('dev'));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);



export default app;
