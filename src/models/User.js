// src/models/User.js
import mongoose,{ Schema, model } from 'mongoose';
import { compare, hash } from 'bcrypt';
import { ADMIN, MANAGER, MEMBER } from '../config/roles.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: [ADMIN, MANAGER, MEMBER], default: MEMBER }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (password) {
  return compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function (password) {
  return hash(password, 12);
};

// src/models/User.js
// ... existing code ...
const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { _id: false });

userSchema.add({
  refreshTokens: { type: [refreshTokenSchema], default: [] }
});

export default model('User', userSchema);

