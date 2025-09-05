# Getting Started

Welcome to the Codalite PMS! This guide will help you set up your development environment and get started with the project.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js**: You can download it from the [official Node.js website](https://nodejs.org/).
- **MongoDB**: Follow the installation instructions on the [MongoDB website](https://www.mongodb.com/try/download/community).

## Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Codalite/pms.git
   cd pms
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

## Environment Variables Setup

Create a `.env` file in the root of the project and add the following variables:

```
DB_URI=mongodb://localhost:27017/pms
PORT=3000
SECRET_KEY=your_secret_key
```

## Seeding Demo Data

To seed the demo data into your MongoDB database, run the following command:

```bash
npm run seed
```

## Running Tests

To run the tests for the project, use the following command:

```bash
npm test
```

## Starting the Server

To start the server, use the command:

```bash
npm start
```

## Troubleshooting Tips

- **MongoDB not running**: Ensure that your MongoDB service is running. You can start it with the command `mongod`.
- **Port already in use**: If you encounter an error about the port being in use, change the `PORT` variable in your `.env` file to an available port.
- **Missing environment variables**: Double-check that all required environment variables are set in your `.env` file.

If you encounter any additional issues, feel free to reach out to the community for support!