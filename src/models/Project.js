import { Schema, model } from 'mongoose';

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['manager', 'member'], default: 'member' }
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] }
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, name: 1 }, { unique: false });

export default model('Project', projectSchema);