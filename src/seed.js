// seed.js
import { config } from 'dotenv';
config();
import { connect } from 'mongoose';
import User from './models/User.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import { ADMIN, MANAGER, MEMBER } from './config/roles.js';

async function run() {
  try {
    await connect(process.env.MONGO_URI);
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