import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  tenantId: mongoose.Types.ObjectId;
  department: string;
  designation: string;
  employeeId: string;
  avatar: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  agentKey: string;
  lastActive: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'company_admin', 'manager', 'employee'],
      default: 'employee',
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    agentKey: { type: String, unique: true, sparse: true },
    lastActive: { type: Date },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ agentKey: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
