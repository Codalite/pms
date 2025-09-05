// src/models/Task.js
import { Schema, model } from 'mongoose';

const taskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['todo', 'in_progress', 'done', 'archived'], default: 'todo', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, index: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true, lowercase: true }]
  },
  { timestamps: true }
);

taskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.status !== 'done' && new Date() > this.dueDate;
});

export default model('Task', taskSchema);