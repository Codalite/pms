# API Reference

## Authentication Endpoints

| Endpoint          | Method | Description                       |
|-------------------|--------|-----------------------------------|
| `/api/auth/login` | POST   | User login                       |
| `/api/auth/logout`| POST   | User logout                      |
| `/api/auth/register` | POST | User registration                |

### Sample Request/Response for Login
**Request Payload:**
```json
{ "username": "user1", "password": "password123" }
```
**Response:**
```json
{ "token": "JWT_TOKEN", "expiresIn": 3600 }
```

## Project/Task CRUD Operations

| Endpoint                | Method | Description                             |
|-------------------------|--------|-----------------------------------------|
| `/api/projects`         | GET    | Retrieve all projects                   |
| `/api/projects`         | POST   | Create a new project                    |
| `/api/projects/{id}`    | GET    | Retrieve a specific project             |
| `/api/projects/{id}`    | PUT    | Update a specific project               |
| `/api/projects/{id}`    | DELETE | Delete a specific project               |

### Sample Request/Response for Creating a Project
**Request Payload:**
```json
{ "name": "New Project", "description": "Project description" }
```
**Response:**
```json
{ "id": 1, "name": "New Project", "description": "Project description" }
```

## User Role Management

| Endpoint                     | Method | Description                              |
|------------------------------|--------|------------------------------------------|
| `/api/users/{id}/roles`      | GET    | Retrieve roles for a user                |
| `/api/users/{id}/roles`      | POST   | Assign a role to a user                  |
| `/api/users/{id}/roles/{role}`| DELETE | Remove a role from a user                |

### Sample Request/Response for Assigning a Role
**Request Payload:**
```json
{ "role": "admin" }
```
**Response:**
```json
{ "message": "Role assigned successfully." }
```

---