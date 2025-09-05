// src/config/session.js
import session from 'express-session';
import MongoStore  from 'connect-mongo';

export default (mongoUrl, secret) =>
  session({
    secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
      // secure: true // enable on HTTPS in production
    }
  });