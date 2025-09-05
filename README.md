# Project Management System (PMS)

A Node.js-based project management system designed to streamline project and task management with robust user authentication and role-based access control. PMS supports both web and internal/mobile clients, using MongoDB for data storage and Nunjucks for server-side rendering.

---

## Badges

![Node.js CI](https://img.shields.io/github/workflow/status/Codalite/pms/Node.js%20CI?style=flat-square)
![License](https://img.shields.io/github/license/Codalite/pms?style=flat-square)
![Issues](https://img.shields.io/github/issues/Codalite/pms?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/Codalite/pms?style=flat-square)

---

## Architecture Diagram

```mermaid
graph TD
    A[Browser / Mobile Client] -->|HTTP/HTTPS| B(Express.js Server)
    B -->|Session/JWT| C[Authentication Middleware]
    B --> D[Controllers]
    D --> E[Models (Mongoose)]
    E --> F[(MongoDB)]
    B --> G[Nunjucks Templates]
```
*Diagram: The project uses Express.js for routing, Nunjucks for server-side views, JWT/Session for authentication, and Mongoose for MongoDB interactions.*

---

## Sample API Requests

**Authentication (Login)**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Create Project**
```http
POST /api/projects
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description"
}
```

**Get Tasks for a Project**
```http
GET /api/projects/{projectId}/tasks
Authorization: Bearer <JWT_TOKEN>
```

**Assign Task to User**
```http
POST /api/tasks/{taskId}/assign
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "userId": "memberUserId"
}
```

---

## Features

- **Project & Task Management:** Create, read, update, and delete projects and tasks.
- **User Authentication:** Supports JWT and session-based authentication.
- **Role-based Access Control:** Admin, Manager, and Member roles with distinct permissions.
- **Internal REST API:** For mobile or other internal clients.
- **Server-side Rendered Views:** Built with Nunjucks templating engine.
- **Seed Data Script:** Easily populate initial users, projects, and tasks.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)
- **Templating:** Nunjucks (server-side rendering)
- **Authentication:** JWT, sessions
- **Other:** Role-based access, RESTful API

---

## Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/Codalite/pms.git
   cd pms
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the project root with the following contents (edit as needed for production):

   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/tasks
   SESSION_SECRET=change_this_in_prod
   JWT_SECRET=change_this_in_prod_too
   NODE_ENV=development
   ```

4. **Seed initial data**
   ```sh
   npm run seed
   ```

5. **Start the application**
   ```sh
   npm start
   ```

---

## Usage

- **Web Interface:**  
  Access via your browser at `http://localhost:3000` (or your configured PORT).
- **API:**  
  Internal REST endpoints available for mobile/other clients (see Wiki/API Reference).

---

## User Roles

- **Admin:** Full access to all features and data.
- **Manager:** Can manage projects and tasks.
- **Member:** Can view and work on assigned tasks.

---

## Branches

- **main:** Stable, production-ready branch.
- **dev:** Latest features and ongoing development (may be ahead of main).

---

## Contributing

- Contribution guidelines and test coverage coming soon!
- Feel free to open issues or pull requests.

---

## License

[Specify your license here]

---

## FAQ

- **Which database is used?**  
  MongoDB (via Mongoose)
- **How is authentication handled?**  
  JWT and session-based
- **Can I run this in production?**  
  Yes! Make sure to change secrets in `.env` and properly secure MongoDB.

---

For API documentation, advanced configuration, or troubleshooting, see the [Wiki](https://github.com/Codalite/pms/wiki).

---