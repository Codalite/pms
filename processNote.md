 # Task management system with Node.js, Express, MongoDB, Mongoose, and Nunjucks

I want to develop a task management system that handles projects, users and  task with deadlines and assignments of task. I want to use nodejs and express with mongodb with mongoose package jwt and season authorization for Auth and nunjucks as the template language.
Task management system with Node.js, Express, MongoDB, Mongoose, and Nunjucks
You’ve got solid tech picks. Below is a pragmatic blueprint you can build on fast, with clean models, secure auth (session or JWT), server-rendered Nunjucks views, and routes that map to real-world project/task workflows.

Project architecture
- Core stack: Node.js, Express, MongoDB, Mongoose, Nunjucks
- Auth options: Session-based (best for server-rendered apps) or JWT (best for APIs/mobile). Pick one, not both.
- Key entities: Users, Projects, Tasks
- Access model: Role-based (admin, manager, member) with per-project membership
- Views: Nunjucks for dashboards, lists, forms
- Security: Password hashing, CSRF on forms (sessions), input validation, rate limiting
Directory layout:
```
project/
  src/
    config/
      db.js
      nunjucks.js
      session.js
      jwt.js
    models/
      User.js
      Project.js
      Task.js
    middleware/
      auth.js
      rbac.js
      validators.js
    controllers/
      authController.js
      projectController.js
      taskController.js
    routes/
      auth.js
      projects.js
      tasks.js
    views/
      layouts/base.njk
      auth/login.njk
      dashboard.njk
      projects/
        index.njk
        show.njk
        form.njk
      tasks/
        form.njk
    app.js
  .env
  package.json
```

### Data model
```js
User model
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' }
}, { timestamps: true });

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function (password) {
  const rounds = 12;
  return bcrypt.hash(password, rounds);
};

module.exports = mongoose.model('User', userSchema);
```

Project model
```js
// src/models/Project.js
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['manager', 'member'], default: 'member' }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 2000 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: { type: [memberSchema], default: [] }
}, { timestamps: true });

projectSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('Project', projectSchema);
```

### Task model
```js
// src/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['todo', 'in_progress', 'done', 'archived'], default: 'todo', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date, index: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String, trim: true, lowercase: true }]
}, { timestamps: true });

taskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.status !== 'done' && new Date() > this.dueDate;
});

module.exports = mongoose.model('Task', taskSchema);
```


Auth and authorization
Choosing between session and JWT
|  |  |  |  |  |  | 
|  |  |  |  |  |  | 
|  |  |  |  |  |  | 


Quick recommendation: If your primary UI is Nunjucks pages, use sessions. If you plan to expose a public API or mobile app, use JWT.
```js
Session setup
// src/config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = (mongoUrl, secret) => session({
  secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    // secure: true // enable in production behind HTTPS
  }
});

```
```js
// src/middleware/auth.js (session)
exports.ensureAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/auth/login');
};

exports.attachUser = (req, _res, next) => {
  res.locals.currentUser = req.session?.user || null;
  next();
};
```

### JWT setup (alternative)
```js
// src/config/jwt.js
const jwt = require('jsonwebtoken');

exports.sign = (payload, secret) => jwt.sign(payload, secret, { expiresIn: '7d' });
exports.verify = (token, secret) => jwt.verify(token, secret);
```

```js
// src/middleware/auth.js (jwt)
const { verify } = require('../config/jwt');

exports.ensureAuthJwt = (secret) => (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.redirect('/auth/login');
  try {
    req.user = verify(token, secret);
    res.locals.currentUser = req.user;
    next();
  } catch {
    return res.redirect('/auth/login');
  }
};
```

### Role-based access control
```js
// src/middleware/rbac.js
const Project = require('../models/Project');

exports.requireRole = (...roles) => (req, res, next) => {
  const user = req.session?.user || req.user; // session or jwt
  if (user && roles.includes(user.role)) return next();
  return res.status(403).send('Forbidden');
};

exports.requireProjectMember = async (req, res, next) => {
  const userId = (req.session?.user || req.user)?._id;
  const projectId = req.params.projectId || req.params.id;
  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).send('Project not found');
  const isOwner = String(project.owner) === String(userId);
  const isMember = project.members.some(m => String(m.user) === String(userId));
  if (isOwner || isMember) return next();
  return res.status(403).send('Forbidden');
};
```


### Routes and controllers
App and config
```js
// src/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const connectDb = require('./config/db');
const configureNunjucks = require('./config/nunjucks');
const sessionMiddleware = require('./config/session');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();
connectDb(process.env.MONGO_URI);

configureNunjucks(app, path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(sessionMiddleware(process.env.MONGO_URI, process.env.SESSION_SECRET));

const { attachUser } = require('./middleware/auth');
app.use(attachUser);

app.use(csrf()); // CSRF for server-rendered forms
app.use((req, res, next) => { res.locals.csrfToken = req.csrfToken(); next(); });

app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);

app.get('/', (_req, res) => res.redirect('/projects'));

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
```

```js
// src/config/db.js
const mongoose = require('mongoose');
module.exports = async (uri) => {
  await mongoose.connect(uri);
  mongoose.connection.on('error', (e) => console.error('Mongo error:', e));
};
```
```js

// src/config/nunjucks.js
const nunjucks = require('nunjucks');
module.exports = (app, viewsPath) => {
  nunjucks.configure(viewsPath, { autoescape: true, express: app, noCache: true });
  app.set('view engine', 'njk');
};
```

### Auth routes
```js
// src/routes/auth.js
const router = require('express').Router();
const User = require('../models/User');

router.get('/login', (_req, res) => res.render('auth/login'));
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).render('auth/login', { error: 'Invalid credentials' });
  }
  req.session.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
  res.redirect('/projects');
});

router.get('/register', (_req, res) => res.render('auth/register'));
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash });
  res.redirect('/auth/login');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;
```

### Project routes and controller
```js
// src/routes/projects.js
const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/rbac');
const projectController = require('../controllers/projectController');

router.use(ensureAuth);

router.get('/', projectController.list);
router.get('/new', projectController.newForm);
router.post('/', projectController.create);
router.get('/:id', requireProjectMember, projectController.show);
router.get('/:id/edit', requireProjectMember, projectController.editForm);
router.post('/:id', requireProjectMember, projectController.update);
router.post('/:id/delete', requireProjectMember, projectController.remove);

router.post('/:id/members', requireProjectMember, projectController.addMember);

module.exports = router;
```

```js
// src/controllers/projectController.js
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

exports.list = async (req, res) => {
  const userId = req.session.user._id;
  const projects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }]
  }).sort({ updatedAt: -1 }).lean();
  res.render('projects/index', { projects });
};

exports.newForm = (_req, res) => res.render('projects/form');

exports.create = async (req, res) => {
  const owner = req.session.user._id;
  const project = await Project.create({ ...req.body, owner });
  res.redirect(`/projects/${project._id}`);
};

exports.show = async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  const tasks = await Task.find({ project: project._id }).sort({ dueDate: 1 }).lean();
  res.render('projects/show', { project, tasks });
};

exports.editForm = async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  res.render('projects/form', { project });
};

exports.update = async (req, res) => {
  await Project.findByIdAndUpdate(req.params.id, { $set: req.body });
  res.redirect(`/projects/${req.params.id}`);
};

exports.remove = async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.redirect('/projects');
};

exports.addMember = async (req, res) => {
  const { email, role } = req.body;
  const user = await User.findOne({ email }).lean();
  if (!user) return res.status(404).send('User not found');
  await Project.findByIdAndUpdate(req.params.id, {
    $addToSet: { members: { user: user._id, role: role || 'member' } }
  });
  res.redirect(`/projects/${req.params.id}`);
};
```

### Task routes and controller
```js
// src/routes/tasks.js
const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/rbac');
const taskController = require('../controllers/taskController');

router.use(ensureAuth);

router.post('/', taskController.create);
router.post('/:id/status', taskController.updateStatus);
router.post('/:id/assign', taskController.assign);
router.post('/:id/delete', taskController.remove);

module.exports = router;
```
```js
// src/controllers/taskController.js
const Task = require('../models/Task');
const Project = require('../models/Project');

exports.create = async (req, res) => {
  const { project, title, description, dueDate, assignees, priority } = req.body;
  await Project.exists({ _id: project }); // ensure project exists
  const task = await Task.create({
    project,
    title,
    description,
    dueDate: dueDate || null,
    assignees: assignees ? [].concat(assignees) : [],
    priority: priority || 'medium',
    createdBy: req.session.user._id
  });
  res.redirect(`/projects/${task.project}`);
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  await Task.findByIdAndUpdate(req.params.id, { $set: { status } });
  res.redirect('back');
};

exports.assign = async (req, res) => {
  const { assignees } = req.body; // single or array of userIds
  await Task.findByIdAndUpdate(req.params.id, { $set: { assignees: [].concat(assignees) } });
  res.redirect('back');
};

exports.remove = async (req, res) => {
  const task = await Task.findById(req.params.id);
  await Task.deleteOne({ _id: req.params.id });
  res.redirect(`/projects/${task.project}`);
};
```


### Views with Nunjucks
Base layout
````js
{# src/views/layouts/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{ title or "Tasks" }}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="/styles.css" rel="stylesheet">
</head>
<body>
  <header>
    <nav>
      {% if currentUser %}
        <span>Hi, {{ currentUser.name }}</span>
        <form action="/auth/logout" method="post" style="display:inline">
          <input type="hidden" name="_csrf" value="{{ csrfToken }}">
          <button type="submit">Logout</button>
        </form>
      {% else %}
        <a href="/auth/login">Login</a>
      {% endif %}
      <a href="/projects">Projects</a>
    </nav>
  </header>
  <main>
    {% block content %}{% endblock %}
  </main>
</body>
</html>
````
### Login page
````html
{# src/views/auth/login.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>Login</h1>
{% if error %}<p style="color:red">{{ error }}</p>{% endif %}
<form method="post" action="/auth/login">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <label>Email <input type="email" name="email" required></label>
  <label>Password <input type="password" name="password" required></label>
  <button type="submit">Sign in</button>
</form>
<p>No account? <a href="/auth/register">Register</a></p>
{% endblock %}
```

### Project show with tasks
```html
{# src/views/projects/show.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>{{ project.name }}</h1>
<p>{{ project.description }}</p>

<h2>Tasks</h2>
<ul>
  {% for t in tasks %}
    <li>
      <strong>{{ t.title }}</strong>
      — {{ t.status }} — due {{ t.dueDate ? t.dueDate | date('YYYY-MM-DD') : 'none' }}
      <form action="/tasks/{{ t._id }}/status" method="post" style="display:inline">
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        <select name="status">
          <option value="todo" {{ 'selected' if t.status == 'todo' }}>To do</option>
          <option value="in_progress" {{ 'selected' if t.status == 'in_progress' }}>In progress</option>
          <option value="done" {{ 'selected' if t.status == 'done' }}>Done</option>
        </select>
        <button type="submit">Update</button>
      </form>
    </li>
  {% endfor %}
</ul>

<h3>New task</h3>
<form action="/tasks" method="post">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <input type="hidden" name="project" value="{{ project._id }}">
  <label>Title <input name="title" required></label>
  <label>Description <textarea name="description"></textarea></label>
  <label>Due date <input type="date" name="dueDate"></label>
  <label>Priority
    <select name="priority">
      <option>low</option><option selected>medium</option><option>high</option>
    </select>
  </label>
  <button type="submit">Create</button>
</form>
{% endblock %}
````


### Setup and next steps
Install and run
- Dependencies:
- express, mongoose, nunjucks, express-session, connect-mongo, bcrypt, cookie-parser, csurf, dotenv
- Dev deps:
- nodemon, eslint (optional)
````bash
npm init -y
npm i express mongoose nunjucks express-session connect-mongo bcrypt cookie-parser csurf dotenv
npm i -D nodemon
````


````js
.env:
MONGO_URI=mongodb://localhost:27017/tasks
SESSION_SECRET=change_this_in_prod
JWT_SECRET=also_change_this_if_using_jwt
PORT=3000
````
````bash
- Run: nodemon src/app.js or node src/app.js
````
### Production essentials
- Validation: Use express-validator or Joi on every POST/PUT.
- Security: Helmet headers, rate limiting on auth, strong session secret, HTTPS with secure cookies.
- Dates/timezones: Store UTC; display local with a helper (Day.js/Luxon).
- Indexes: Ensure Task.dueDate, Task.status, Task.project indexes exist for snappy queries.
- Background jobs: For due-date reminders, schedule checks (e.g., node-cron) and send emails via a provider.
- Pagination: On projects and tasks lists to keep pages fast.

If you tell me:
- Whether you prefer sessions or JWT
- Your target UI (server-rendered only, or also a JSON API)
- The exact roles you want (admin/manager/member, or different)
…I’ll tailor the auth, middleware, and views to your flow and add the missing pieces like validation and notifications.

Ok I'll use use season for now but I'll like to expose api later. server-rendered for the main site and plane to expose api for feature mobile app, for the roles use admin, manager and member.

Got it — so we’ll start session-based auth for the main Nunjucks-powered site, but design the architecture so that later you can bolt on a JWT-protected API for your mobile app without rewriting everything.
We’ll also bake in role-based access control (admin, manager, member) from day one so both the web and API share the same rules.
Here’s how I’d structure it so you can grow into the API later:

1️⃣ Auth & Role Strategy
Session now, JWT later
- Sessions: Store req.session.user with _id, name, email, role.
- JWT-ready: Keep all auth logic in middleware functions that can work with either req.session.user or req.user (decoded from JWT).
That way, when you add the API, you just plug in a JWT middleware without touching controllers.
Example hybrid getCurrentUser middleware:
```js
// src/middleware/currentUser.js
module.exports = (req, res, next) => {
  const user = req.session?.user || req.user || null;
  req.currentUser = user;
  res.locals.currentUser = user; // for Nunjucks
  next();
};
```


2️⃣ Role-based Access Control (RBAC)
We’ll define roles in one place so both web and API can use them:
```js
// src/config/roles.js
module.exports = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};
```

Middleware to enforce roles:
```js
// src/middleware/requireRole.js
module.exports = (...allowedRoles) => (req, res, next) => {
  const role = req.currentUser?.role;
  if (role && allowedRoles.includes(role)) return next();
  return res.status(403).send('Forbidden');
};
```


3️⃣ Project & Task Permissions
We’ll add project membership checks so managers/members only see their own projects:
```js
// src/middleware/requireProjectAccess.js
const Project = require('../models/Project');

module.exports = async (req, res, next) => {
  const userId = req.currentUser?._id;
  const projectId = req.params.projectId || req.params.id;
  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).send('Project not found');

  const isOwner = String(project.owner) === String(userId);
  const isMember = project.members.some(m => String(m.user) === String(userId));

  if (isOwner || isMember || req.currentUser.role === 'admin') {
    req.project = project;
    return next();
  }
  return res.status(403).send('Forbidden');
};
```


4️⃣ API-ready Routing
We’ll keep controllers free of Express-specific stuff like res.render so they can be reused for both web and API.
Example:
```js
// src/controllers/projectController.js
exports.listProjects = async (req, res) => {
  const projects = await Project.find({
    $or: [
      { owner: req.currentUser._id },
      { 'members.user': req.currentUser._id }
    ]
  }).lean();

  if (req.isApi) {
    return res.json({ projects });
  }
  res.render('projects/index', { projects });
};
```

Then in routes:
```js
// Web
router.get('/', projectController.listProjects);

// API
apiRouter.get('/projects', (req, res, next) => {
  req.isApi = true;
  next();
}, projectController.listProjects);

```

5️⃣ Migration Path to API
When you’re ready to add the mobile app:
- Create /api routes with JWT middleware.
- Reuse the same controllers.
- Add CORS for API routes only.
- Keep sessions for web, JWT for API.

6️⃣ Role Capabilities
|  |  | 
|  |  | 
|  |  | 
|  |  | 



If you want, I can extend the code I gave you earlier so it’s already API-ready — meaning you’ll have /projects for web and /api/projects for mobile, both using the same logic but different auth layers. That way, when you flip the API switch, it’s just a matter of adding JWT middleware and CORS.
Do you want me to prepare that dual-mode controller + route setup now so you’re future-proof from day one?

## Yes and also put everything together for easy copy-paste
Node.js task manager: web (sessions) now, API (JWT-ready) later
You’ll get a copy‑paste project you can run today with sessions and Nunjucks, and flip on an API later without refactoring. Controllers serve both web pages and JSON using the same logic.

Project scaffold
- Web app: Session auth, CSRF, Nunjucks.
- API-ready: Same controllers; /api/* routes return JSON, JWT middleware stubbed for later.
- RBAC: admin, manager, member.
- Entities: User, Project, Task.
```
project/
  .env
  package.json
  src/
    app.js
    config/
      db.js
      nunjucks.js
      session.js
      jwt.js
      roles.js
    models/
      User.js
      Project.js
      Task.js
    middleware/
      currentUser.js
      ensureAuth.js
      ensureApiAuth.js
      requireRole.js
      requireProjectAccess.js
      isApi.js
      errorHandler.js
    controllers/
      authController.js
      projectController.js
      taskController.js
    routes/
      web/
        auth.js
        projects.js
        tasks.js
      api/
        index.js
        projects.js
        tasks.js
    views/
      layouts/
        base.njk
      auth/
        login.njk
        register.njk
      dashboard.njk
      projects/
        index.njk
        form.njk
        show.njk
      tasks/
        form.njk
```


1) Package.json and .env
```json
{
  "name": "task-manager",
  "version": "1.0.0",
  "main": "src/app.js",
  "type": "commonjs",
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "lint": "echo \"Add ESLint if you want\""
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "connect-mongo": "^5.1.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "csurf": "^1.11.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-session": "^1.17.3",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.1",
    "nunjucks": "^3.2.4"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

# .env
```js
PORT=3000
MONGO_URI=mongodb://localhost:27017/tasks
SESSION_SECRET=change_this_in_prod
JWT_SECRET=change_this_in_prod_too
NODE_ENV=development
```


2) App bootstrap
```js
// src/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const cors = require('cors');

const connectDb = require('./config/db');
const configureNunjucks = require('./config/nunjucks');
const sessionMiddleware = require('./config/session');

const webAuthRoutes = require('./routes/web/auth');
const webProjectRoutes = require('./routes/web/projects');
const webTaskRoutes = require('./routes/web/tasks');

const apiRouter = require('./routes/api/index');

const currentUser = require('./middleware/currentUser');
const isApi = require('./middleware/isApi');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// DB
connectDb(process.env.MONGO_URI);

// Security & basics
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Views
configureNunjucks(app, path.join(__dirname, 'views'));

// Sessions (web)
app.use(sessionMiddleware(process.env.MONGO_URI, process.env.SESSION_SECRET));

// Attach user to req/res.locals
app.use(currentUser);

// Static (optional place your assets)
app.use(express.static(path.join(__dirname, '../public')));

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
```


3) Config
```js
// src/config/db.js
const mongoose = require('mongoose');

module.exports = async (uri) => {
  await mongoose.connect(uri);
  mongoose.connection.on('error', (e) => console.error('Mongo error:', e));
  console.log('MongoDB connected');
};
```
```js
// src/config/nunjucks.js
const nunjucks = require('nunjucks');

module.exports = (app, viewsPath) => {
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production'
  });
  app.set('view engine', 'njk');
};
```
```js
// src/config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = (mongoUrl, secret) =>
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
```
```js
// src/config/jwt.js  (for later API use)
const jwt = require('jsonwebtoken');

exports.sign = (payload, secret) => jwt.sign(payload, secret, { expiresIn: '7d' });
exports.verify = (token, secret) => jwt.verify(token, secret);
```

```js
// src/config/roles.js
module.exports = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};
```


4) Models
```js
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ADMIN, MANAGER, MEMBER } = require('../config/roles');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: [ADMIN, MANAGER, MEMBER], default: MEMBER }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('User', userSchema);
```

```js
// src/models/Project.js
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['manager', 'member'], default: 'member' }
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] }
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, name: 1 }, { unique: false });

module.exports = mongoose.model('Project', projectSchema);
```

```js
// src/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['todo', 'in_progress', 'done', 'archived'], default: 'todo', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, index: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true, lowercase: true }]
  },
  { timestamps: true }
);

taskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.status !== 'done' && new Date() > this.dueDate;
});

module.exports = mongoose.model('Task', taskSchema);
```


5) Middleware
```js
// src/middleware/currentUser.js
module.exports = (req, res, next) => {
  const user = req.session?.user || req.user || null;
  req.currentUser = user;
  res.locals.currentUser = user;
  next();
};
```
```js
// src/middleware/ensureAuth.js  (web: session)
module.exports = (req, res, next) => {
  if (req.currentUser) return next();
  return res.redirect('/auth/login');
};
```
```js
// src/middleware/ensureApiAuth.js  (api: JWT later)
const { verify } = require('../config/jwt');

module.exports = (req, res, next) => {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.currentUser = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
```
```js
// src/middleware/requireRole.js
module.exports = (...allowed) => (req, res, next) => {
  const role = req.currentUser?.role;
  if (role && allowed.includes(role)) return next();
  return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
};
```

```js
// src/middleware/requireProjectAccess.js
const Project = require('../models/Project');

module.exports = async (req, res, next) => {
  try {
    const userId = req.currentUser?._id;
    const projectId = req.params.projectId || req.params.id || req.body.project;
    if (!projectId) return res.status(400).send('Project id required');
    const project = await Project.findById(projectId).lean();
    if (!project) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Project not found');

    const isOwner = String(project.owner) === String(userId);
    const isMember = project.members.some((m) => String(m.user) === String(userId));
    const isAdmin = req.currentUser?.role === 'admin';

    if (isOwner || isMember || isAdmin) {
      req.project = project;
      return next();
    }
    return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
  } catch (e) {
    next(e);
  }
};
```

```js
// src/middleware/isApi.js
module.exports = (req, _res, next) => {
  req.isApi = true;
  next();
};
```

```js
// src/middleware/errorHandler.js
module.exports = (err, req, res, _next) => {
  console.error(err);
  if (req.isApi) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).send('Something went wrong');
};
```


6) Controllers (dual-mode: web render or JSON)
```js
// src/controllers/authController.js
const User = require('../models/User');

exports.showLogin = (_req, res) => res.render('auth/login');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).render('auth/login', { error: 'Invalid credentials' });
  }
  req.session.user = { _id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  res.redirect('/projects');
};

exports.showRegister = (_req, res) => res.render('auth/register');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).render('auth/register', { error: 'Email already in use' });
  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash });
  res.redirect('/auth/login');
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};
```

```js
// src/controllers/projectController.js
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

exports.list = async (req, res) => {
  const uid = req.currentUser._id;
  const projects = await Project.find({
    $or: [{ owner: uid }, { 'members.user': uid }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (req.isApi) return res.json({ projects });
  res.render('projects/index', { projects });
};

exports.show = async (req, res) => {
  const project = req.project || (await Project.findById(req.params.id).lean());
  if (!project) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Not found');

  const tasks = await Task.find({ project: project._id }).sort({ dueDate: 1 }).lean();

  if (req.isApi) return res.json({ project, tasks });
  res.render('projects/show', { project, tasks });
};

exports.newForm = (_req, res) => res.render('projects/form', { project: null });

exports.create = async (req, res) => {
  const owner = req.currentUser._id;
  const { name, description } = req.body;
  const project = await Project.create({ name, description, owner });

  if (req.isApi) return res.status(201).json({ project });
  res.redirect(`/projects/${project._id}`);
};

exports.editForm = async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) return res.status(404).send('Not found');
  res.render('projects/form', { project });
};

exports.update = async (req, res) => {
  const { name, description } = req.body;
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: { name, description } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ project });
  res.redirect(`/projects/${req.params.id}`);
};

exports.remove = async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  if (req.isApi) return res.status(204).end();
  res.redirect('/projects');
};

exports.addMember = async (req, res) => {
  const { email, role } = req.body;
  const user = await User.findOne({ email }).lean();
  if (!user) return req.isApi ? res.status(404).json({ error: 'User not found' }) : res.status(404).send('User not found');

  await Project.findByIdAndUpdate(req.params.id, {
    $addToSet: { members: { user: user._id, role: role || 'member' } }
  });

  if (req.isApi) return res.status(204).end();
  res.redirect(`/projects/${req.params.id}`);
};
```

```js
// src/controllers/taskController.js
const Task = require('../models/Task');
const Project = require('../models/Project');

exports.create = async (req, res) => {
  const { project, title, description, dueDate, assignees, priority } = req.body;

  // Ensure requester has access to project
  const prj = await Project.findById(project).lean();
  if (!prj) return req.isApi ? res.status(404).json({ error: 'Project not found' }) : res.status(404).send('Project not found');

  const uid = req.currentUser._id;
  const isOwner = String(prj.owner) === String(uid);
  const isMember = prj.members.some((m) => String(m.user) === String(uid));
  const isAdmin = req.currentUser?.role === 'admin';
  if (!isOwner && !isMember && !isAdmin) {
    return req.isApi ? res.status(403).json({ error: 'Forbidden' }) : res.status(403).send('Forbidden');
  }

  const task = await Task.create({
    project,
    title,
    description,
    dueDate: dueDate || null,
    assignees: assignees ? [].concat(assignees) : [],
    priority: priority || 'medium',
    createdBy: uid
  });

  if (req.isApi) return res.status(201).json({ task });
  res.redirect(`/projects/${project}`);
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ task });
  res.redirect('back');
};

exports.assign = async (req, res) => {
  const { assignees } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { assignees: [].concat(assignees || []) } },
    { new: true }
  ).lean();

  if (req.isApi) return res.json({ task });
  res.redirect('back');
};

exports.remove = async (req, res) => {
  const task = await Task.findById(req.params.id).lean();
  if (!task) return req.isApi ? res.status(404).json({ error: 'Task not found' }) : res.status(404).send('Not found');

  await Task.deleteOne({ _id: task._id });

  if (req.isApi) return res.status(204).end();
  res.redirect(`/projects/${task.project}`);
};
```


7) Routes
```js
// src/routes/web/auth.js
const router = require('express').Router();
const authController = require('../../controllers/authController');

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/register', authController.showRegister);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

module.exports = router;
```
```js
// src/routes/web/projects.js
const router = require('express').Router();
const ensureAuth = require('../../middleware/ensureAuth');
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const projectController = require('../../controllers/projectController');

router.use(ensureAuth);

router.get('/', projectController.list);
router.get('/new', projectController.newForm);
router.post('/', projectController.create);

router.get('/:id', requireProjectAccess, projectController.show);
router.get('/:id/edit', requireProjectAccess, projectController.editForm);
router.post('/:id', requireProjectAccess, projectController.update);
router.post('/:id/delete', requireProjectAccess, projectController.remove);
router.post('/:id/members', requireProjectAccess, projectController.addMember);

module.exports = router;
```

```js
// src/routes/web/tasks.js
const router = require('express').Router();
const ensureAuth = require('../../middleware/ensureAuth');
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const taskController = require('../../controllers/taskController');

router.use(ensureAuth);

router.post('/', requireProjectAccess, taskController.create);
router.post('/:id/status', taskController.updateStatus);
router.post('/:id/assign', taskController.assign);
router.post('/:id/delete', taskController.remove);

module.exports = router;
```

```js
// src/routes/api/index.js
const router = require('express').Router();
const ensureApiAuth = require('../../middleware/ensureApiAuth');

const projectApi = require('./projects');
const taskApi = require('./tasks');

// Example public ping
router.get('/ping', (_req, res) => res.json({ ok: true }));

// Protected routes (JWT later)
router.use(ensureApiAuth);
router.use('/projects', projectApi);
router.use('/tasks', taskApi);

module.exports = router;
```
```js
// src/routes/api/projects.js
const router = require('express').Router();
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const projectController = require('../../controllers/projectController');

router.get('/', projectController.list);
router.get('/:id', requireProjectAccess, projectController.show);
router.post('/', projectController.create);
router.patch('/:id', requireProjectAccess, projectController.update);
router.delete('/:id', requireProjectAccess, projectController.remove);
router.post('/:id/members', requireProjectAccess, projectController.addMember);

module.exports = router;
```

```js
// src/routes/api/tasks.js
const router = require('express').Router();
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const taskController = require('../../controllers/taskController');

router.post('/', requireProjectAccess, taskController.create);
router.patch('/:id/status', taskController.updateStatus);
router.patch('/:id/assign', taskController.assign);
router.delete('/:id', taskController.remove);

module.exports = router;
```


8) Views (Nunjucks)
```html
{# src/views/layouts/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{ title or "Task Manager" }}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:system-ui,Arial,sans-serif;margin:2rem;line-height:1.4}
    header nav a{margin-right:1rem}
    form.inline{display:inline}
    label{display:block;margin:.5rem 0}
    input, textarea, select{width:100%;max-width:420px;padding:.5rem}
    .error{color:#b00020}
  </style>
</head>
<body>
  <header>
    <nav>
      {% if currentUser %}
        <span>Hi, {{ currentUser.name }}</span>
        <form class="inline" action="/auth/logout" method="post">
          <input type="hidden" name="_csrf" value="{{ csrfToken }}">
          <button type="submit">Logout</button>
        </form>
      {% else %}
        <a href="/auth/login">Login</a>
        <a href="/auth/register">Register</a>
      {% endif %}
      <a href="/projects">Projects</a>
    </nav>
  </header>
  <main>
    {% block content %}{% endblock %}
  </main>
</body>
</html>
```

```html
{# src/views/auth/login.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>Login</h1>
{% if error %}<p class="error">{{ error }}</p>{% endif %}
<form method="post" action="/auth/login">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <label>Email <input type="email" name="email" required></label>
  <label>Password <input type="password" name="password" required></label>
  <button type="submit">Sign in</button>
</form>
<p>No account? <a href="/auth/register">Register</a></p>
{% endblock %}
```
```html
{# src/views/auth/register.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>Register</h1>
{% if error %}<p class="error">{{ error }}</p>{% endif %}
<form method="post" action="/auth/register">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <label>Name <input name="name" required></label>
  <label>Email <input type="email" name="email" required></label>
  <label>Password <input type="password" name="password" required minlength="6"></label>
  <button type="submit">Create account</button>
</form>
{% endblock %}
```

```html
{# src/views/projects/index.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>Projects</h1>
<p><a href="/projects/new">+ New project</a></p>
<ul>
  {% for p in projects %}
    <li><a href="/projects/{{ p._id }}">{{ p.name }}</a></li>
  {% else %}
    <li>No projects yet.</li>
  {% endfor %}
</ul>
{% endblock %}
```
```html
{# src/views/projects/form.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>{{ project ? "Edit project" : "New project" }}</h1>
<form method="post" action="{{ project ? '/projects/' + project._id : '/projects' }}">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <label>Name <input name="name" value="{{ project?.name }}" required></label>
  <label>Description <textarea name="description">{{ project?.description }}</textarea></label>
  <button type="submit">{{ project ? "Save" : "Create" }}</button>
</form>
{% if project %}
<form method="post" action="/projects/{{ project._id }}/delete" style="margin-top:1rem">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <button type="submit" onclick="return confirm('Delete project?')">Delete</button>
</form>
{% endif %}
{% endblock %}
```

```html
{# src/views/projects/show.njk #}
{% extends "layouts/base.njk" %}
{% block content %}
<h1>{{ project.name }}</h1>
<p>{{ project.description }}</p>

<h2>Tasks</h2>
<ul>
  {% for t in tasks %}
    <li>
      <strong>{{ t.title }}</strong>
      — {{ t.status }} — due {{ t.dueDate ? t.dueDate | date('YYYY-MM-DD') : 'none' }}
      <form class="inline" action="/tasks/{{ t._id }}/status" method="post">
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        <select name="status">
          <option value="todo" {{ 'selected' if t.status == 'todo' }}>To do</option>
          <option value="in_progress" {{ 'selected' if t.status == 'in_progress' }}>In progress</option>
          <option value="done" {{ 'selected' if t.status == 'done' }}>Done</option>
        </select>
        <button type="submit">Update</button>
      </form>
      <form class="inline" action="/tasks/{{ t._id }}/delete" method="post">
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        <button type="submit">Delete</button>
      </form>
    </li>
  {% else %}
    <li>No tasks yet.</li>
  {% endfor %}
</ul>

<h3>New task</h3>
<form action="/tasks" method="post">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <input type="hidden" name="project" value="{{ project._id }}">
  <label>Title <input name="title" required></label>
  <label>Description <textarea name="description"></textarea></label>
  <label>Due date <input type="date" name="dueDate"></label>
  <label>Priority
    <select name="priority">
      <option>low</option><option selected>medium</option><option>high</option>
    </select>
  </label>
  <button type="submit">Create</button>
</form>

<h3>Add member</h3>
<form method="post" action="/projects/{{ project._id }}/members">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <label>User email <input type="email" name="email" required></label>
  <label>Role
    <select name="role">
      <option value="member">member</option>
      <option value="manager">manager</option>
    </select>
  </label>
  <button type="submit">Add</button>
</form>
{% endblock %}
```


9) Run it
- Install: npm i
- Start dev: npm run dev
- Open: http://localhost:3000
Web is ready now with sessions and CSRF. When you’re ready to expose the API:
- Issue JWTs on a new /api/auth/login (reuse User + jwt.sign).
- Protect /api/* with ensureApiAuth.
- Keep web routes on sessions. Both share controllers.
Want me to add a simple /api/auth/login that returns a JWT to finish the loop?

## Continue
Perfect — let’s bolt on the API login so your mobile app can authenticate with JWT while your web app keeps using sessions.
We’ll add:
- /api/auth/login — accepts email/password, returns a signed JWT.
- /api/auth/me — returns the current user’s profile (JWT-protected).
- A shared password hashing/verification flow with your existing User model.

1️⃣ API Auth Controller
```js
// src/controllers/apiAuthController.js
const User = require('../models/User');
const { sign } = require('../config/jwt');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Payload for JWT — keep it small
  const payload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };

  const token = sign(payload, process.env.JWT_SECRET);

  res.json({
    token,
    user: payload
  });
};

exports.me = async (req, res) => {
  // req.currentUser is set by ensureApiAuth
  res.json({ user: req.currentUser });
};

```


2️⃣ API Auth Routes
```js
// src/routes/api/auth.js
const router = require('express').Router();
const apiAuthController = require('../../controllers/apiAuthController');
const ensureApiAuth = require('../../middleware/ensureApiAuth');

// Public login
router.post('/login', apiAuthController.login);

// Protected "me" endpoint
router.get('/me', ensureApiAuth, apiAuthController.me);

module.exports = router;
```


3️⃣ Hook into API Router
Update src/routes/api/index.js to include the new auth routes:
```js
// src/routes/api/index.js
const router = require('express').Router();
const ensureApiAuth = require('../../middleware/ensureApiAuth');

const authApi = require('./auth');
const projectApi = require('./projects');
const taskApi = require('./tasks');

router.get('/ping', (_req, res) => res.json({ ok: true }));

// Public auth routes
router.use('/auth', authApi);

// Protected routes
router.use(ensureApiAuth);
router.use('/projects', projectApi);
router.use('/tasks', taskApi);

module.exports = router;
```


4️⃣ Testing the API Login
Once running:
Login request:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret"}'

```
Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "_id": "64f9c1...",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Authenticated request:
```bashm
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```


5️⃣ How it fits with your current setup
- Web app: still uses sessions + CSRF + Nunjucks.
- API: stateless JWT auth, no CSRF, CORS enabled.
- Controllers: dual-mode — render HTML for web, return JSON for API.
- Roles: enforced in both worlds via requireRole and requireProjectAccess.

If you like, I can also add a JWT refresh token flow so mobile clients can stay logged in without re-entering credentials, plus a /api/auth/register for mobile signups — or we can keep it lean for now and only add those when you start the mobile app.
Do you want me to extend this with refresh tokens and mobile-friendly registration right away so you’re fully future-proof?

## Yes
Alright — let’s make your API mobile‑ready with a proper registration endpoint and a refresh token flow so mobile clients can stay logged in without re‑entering credentials.
We’ll keep it secure, simple, and consistent with the session‑based web app you already have.

🔑 How the refresh token flow will work
- Login/Register:
- Client sends email/password.
- Server returns access token (short‑lived, e.g., 15 min) and refresh token (long‑lived, e.g., 7 days).
- Refresh token is stored in DB and tied to the user.
- Accessing protected API routes:
- Client sends the access token in the Authorization header.
- If expired, client calls /api/auth/refresh with the refresh token to get a new access token.
- Logout:
- Server deletes the refresh token from DB.

1️⃣ Extend the User model to store refresh tokens
```js
// src/models/User.js
// ... existing code ...
const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { _id: false });

userSchema.add({
  refreshTokens: { type: [refreshTokenSchema], default: [] }
});

```

2️⃣ API Auth Controller with register, login, refresh, logout
```js
// src/controllers/apiAuthController.js
const User = require('../models/User');
const { sign, verify } = require('../config/jwt');
const crypto = require('crypto');

const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP_DAYS = 7;

function generateAccessToken(user) {
  return sign({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: 'Email already in use' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  res.status(201).json({
    accessToken,
    refreshToken,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role }
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  res.json({
    accessToken,
    refreshToken,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role }
  });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

  const stored = user.refreshTokens.find(rt => rt.token === refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const accessToken = generateAccessToken(user);
  res.json({ accessToken });
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();
  }
  res.status(204).end();
};

exports.me = async (req, res) => {
  res.json({ user: req.currentUser });
};
```


3️⃣ API Auth Routes
```js
// src/routes/api/auth.js
const router = require('express').Router();
const apiAuthController = require('../../controllers/apiAuthController');
const ensureApiAuth = require('../../middleware/ensureApiAuth');

// Public
router.post('/register', apiAuthController.register);
router.post('/login', apiAuthController.login);
router.post('/refresh', apiAuthController.refresh);

// Protected
router.get('/me', ensureApiAuth, apiAuthController.me);
router.post('/logout', apiAuthController.logout);

module.exports = router;

```

4️⃣ Update API index router
```js
// src/routes/api/index.js
const router = require('express').Router();
const authApi = require('./auth');
const ensureApiAuth = require('../../middleware/ensureApiAuth');
const projectApi = require('./projects');
const taskApi = require('./tasks');

router.get('/ping', (_req, res) => res.json({ ok: true }));

// Public auth
router.use('/auth', authApi);

// Protected
router.use(ensureApiAuth);
router.use('/projects', projectApi);
router.use('/tasks', taskApi);

module.exports = router;

```

5️⃣ Mobile client flow
- Register: POST /api/auth/register → store accessToken + refreshToken.
- Login: POST /api/auth/login → store tokens.
- Access API: send Authorization: Bearer <accessToken>.
- Refresh: when access token expires, POST /api/auth/refresh with { refreshToken } to get a new access token.
- Logout: POST /api/auth/logout with { refreshToken } to invalidate it.

This setup means:
- Your web app keeps using sessions and CSRF.
- Your mobile app uses JWTs with refresh tokens.
- Both share the same User model and RBAC rules.
If you want, I can now add role‑based restrictions to the API endpoints so, for example, only admins can delete projects, managers can assign tasks, and members can only update their own tasks. That would make the API production‑ready from a permissions standpoint.
Do you want me to add that RBAC layer next so both web and API enforce the same role rules?

## Yes

Alright — let’s lock down both the web and API sides with role‑based access control (RBAC) so your admin, manager, and member roles have clearly defined powers.
We’ll make it centralized so you don’t have to sprinkle role checks all over the place — just declare the rules once and reuse them.

1️⃣ Define role capabilities
We’ll keep this in a single config so both web and API can use it:
```js
// src/config/permissions.js
const { ADMIN, MANAGER, MEMBER } = require('./roles');

module.exports = {
  project: {
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],
    addMember: [ADMIN, MANAGER],
    view: [ADMIN, MANAGER, MEMBER]
  },
  task: {
    create: [ADMIN, MANAGER, MEMBER],
    update: [ADMIN, MANAGER, MEMBER],
    delete: [ADMIN, MANAGER],
    assign: [ADMIN, MANAGER]
  }
};
```


2️⃣ Generic permission middleware
This will check if the current user’s role is allowed for a given action:

```js
// src/middleware/requirePermission.js
const permissions = require('../config/permissions');

module.exports = (resource, action) => {
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

```

3️⃣ Apply to web routes
Example for projects:
```js
// src/routes/web/projects.js
const router = require('express').Router();
const ensureAuth = require('../../middleware/ensureAuth');
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const requirePermission = require('../../middleware/requirePermission');
const projectController = require('../../controllers/projectController');

router.use(ensureAuth);

router.get('/', projectController.list);
router.get('/new', requirePermission('project', 'create'), projectController.newForm);
router.post('/', requirePermission('project', 'create'), projectController.create);

router.get('/:id', requireProjectAccess, projectController.show);
router.get('/:id/edit', requireProjectAccess, requirePermission('project', 'update'), projectController.editForm);
router.post('/:id', requireProjectAccess, requirePermission('project', 'update'), projectController.update);
router.post('/:id/delete', requireProjectAccess, requirePermission('project', 'delete'), projectController.remove);
router.post('/:id/members', requireProjectAccess, requirePermission('project', 'addMember'), projectController.addMember);

module.exports = router;
```


4️⃣ Apply to API routes
Example for tasks:
```js
// src/routes/api/tasks.js
const router = require('express').Router();
const requireProjectAccess = require('../../middleware/requireProjectAccess');
const requirePermission = require('../../middleware/requirePermission');
const taskController = require('../../controllers/taskController');

router.post('/', requireProjectAccess, requirePermission('task', 'create'), taskController.create);
router.patch('/:id/status', requirePermission('task', 'update'), taskController.updateStatus);
router.patch('/:id/assign', requirePermission('task', 'assign'), taskController.assign);
router.delete('/:id', requirePermission('task', 'delete'), taskController.remove);

module.exports = router;
```


5️⃣ How it works
- Centralized rules: Change permissions.js and it applies everywhere.
- Dual‑mode: Works for both web (sessions) and API (JWT).
- Layered security:
- requireProjectAccess ensures the user is part of the project (or admin).
- requirePermission ensures their role is allowed to perform the action.

6️⃣ Example role powers
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 
|  |  |  |  | 




This means your web UI and mobile API will now enforce the exact same role rules without duplicating logic.
If you want, I can now add seed scripts so you can quickly create an admin, a manager, and a member in your database for testing — that way you can log in as each and see the restrictions in action.
Do you want me to prepare that quick seed script next so you can test RBAC immediately?

## Yes

Perfect — let’s give you a quick seed script so you can instantly create an admin, manager, and member in your MongoDB for RBAC testing.
This way, you can log in as each role and see the restrictions in action on both the web and API.

1️⃣ Create the seed script
Make a new file:
```js
// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { ADMIN, MANAGER, MEMBER } = require('./src/config/roles');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing test users (optional)
    await User.deleteMany({ email: { $in: ['admin@example.com', 'manager@example.com', 'member@example.com'] } });

    // Create users
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: await User.hashPassword('admin123'),
      role: ADMIN
    });

    const manager = new User({
      name: 'Manager User',
      email: 'manager@example.com',
      passwordHash: await User.hashPassword('manager123'),
      role: MANAGER
    });

    const member = new User({
      name: 'Member User',
      email: 'member@example.com',
      passwordHash: await User.hashPassword('member123'),
      role: MEMBER
    });

    await admin.save();
    await manager.save();
    await member.save();

    console.log('✅ Seeded users:');
    console.log(`Admin:   admin@example.com / admin123`);
    console.log(`Manager: manager@example.com / manager123`);
    console.log(`Member:  member@example.com / member123`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err);
    process.exit(1);
  }
}

run();
```


2️⃣ Add a script entry in package.json
```json
"scripts": {
  "dev": "nodemon src/app.js",
  "start": "node src/app.js",
  "seed": "node seed.js"
}

```

3️⃣ Run the seeder
npm run seed


You should see:
Connected to MongoDB
✅ Seeded users:
Admin:   admin@example.com / admin123
Manager: manager@example.com / manager123
Member:  member@example.com / member123



4️⃣ Testing RBAC
- Web: Log in at /auth/login with each account and try creating/deleting projects or assigning tasks.
- API:
- POST /api/auth/login with each account to get a JWT.
- Call protected endpoints and watch the permissions kick in.

5️⃣ Optional — keep seeds idempotent
If you want to run the seed script multiple times without creating duplicates, you can replace the deleteMany + save with findOneAndUpdate and { upsert: true }.

If you like, I can also prepare a matching seed script for sample projects and tasks so you can test the whole flow — projects with members, tasks assigned, and due dates — right after seeding the users. That would let you see RBAC in action without manually creating data in the UI.
Do you want me to add that sample project/task seeder next so you can test everything end‑to‑end immediately?

## Yes 
Alright — let’s supercharge your seed data so you can spin up users, projects, and tasks in one go and immediately test RBAC, project membership, and task flows without clicking through the UI.
We’ll build on the seed.js you already have, adding:
- 3 users: admin, manager, member (already done)
- 2 projects: one owned by the admin, one by the manager
- Tasks: a mix of statuses, priorities, due dates, and assignees

Updated seed.js
```js
// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const Task = require('./src/models/Task');
const { ADMIN, MANAGER, MEMBER } = require('./src/config/roles');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear old seed data
    await User.deleteMany({ email: { $in: ['admin@example.com', 'manager@example.com', 'member@example.com'] } });
    await Project.deleteMany({ name: { $in: ['Admin Project', 'Manager Project'] } });
    await Task.deleteMany({});

    // Create users
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: await User.hashPassword('admin123'),
      role: ADMIN
    });

    const manager = new User({
      name: 'Manager User',
      email: 'manager@example.com',
      passwordHash: await User.hashPassword('manager123'),
      role: MANAGER
    });

    const member = new User({
      name: 'Member User',
      email: 'member@example.com',
      passwordHash: await User.hashPassword('member123'),
      role: MEMBER
    });

    await admin.save();
    await manager.save();
    await member.save();

    console.log('✅ Users seeded');

    // Create projects
    const adminProject = await Project.create({
      name: 'Admin Project',
      description: 'Project owned by Admin',
      owner: admin._id,
      members: [
        { user: manager._id, role: 'manager' },
        { user: member._id, role: 'member' }
      ]
    });

    const managerProject = await Project.create({
      name: 'Manager Project',
      description: 'Project owned by Manager',
      owner: manager._id,
      members: [
        { user: member._id, role: 'member' }
      ]
    });

    console.log('✅ Projects seeded');

    // Create tasks for Admin Project
    await Task.create([
      {
        project: adminProject._id,
        title: 'Setup project repo',
        description: 'Initialize GitHub repository and add README',
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() - 86400000), // yesterday
        assignees: [admin._id],
        createdBy: admin._id
      },
      {
        project: adminProject._id,
        title: 'Design database schema',
        description: 'Plan collections and relationships',
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 86400000), // in 3 days
        assignees: [manager._id],
        createdBy: admin._id
      }
    ]);

    // Create tasks for Manager Project
    await Task.create([
      {
        project: managerProject._id,
        title: 'Write API docs',
        description: 'Document endpoints for mobile app',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 86400000),
        assignees: [member._id],
        createdBy: manager._id
      },
      {
        project: managerProject._id,
        title: 'Implement auth middleware',
        description: 'JWT and session handling',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 86400000),
        assignees: [manager._id],
        createdBy: manager._id
      }
    ]);

    console.log('✅ Tasks seeded');

    console.log('\n--- Login credentials ---');
    console.log(`Admin:   admin@example.com / admin123`);
    console.log(`Manager: manager@example.com / manager123`);
    console.log(`Member:  member@example.com / member123`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

run();
```


How to run
npm run seed


You’ll get:
- Admin Project: owned by admin, with manager + member as collaborators
- Manager Project: owned by manager, with member as collaborator
- Tasks: varied statuses, priorities, and due dates

Testing RBAC instantly
- Web:
- Log in as admin → can edit/delete both projects.
- Log in as manager → can edit their own project, add members, assign tasks, but not delete admin’s project.
- Log in as member → can only view projects they’re in and update their own tasks.
- API:
- POST /api/auth/login with each user → get JWT.
- Call /api/projects and /api/tasks to see role restrictions in action.

If you want, I can now add a script to wipe and reseed everything in one command so you can refresh your dev DB in seconds while testing mobile and web flows side‑by‑side. That would make iterating on features much faster.
Do you want me to prepare that “reset & seed” combo script next?
