import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeEntry {
  userId: mongoose.Types.ObjectId;
  date: string;
  minutes: number;
  description: string;
}

export interface IProject extends Document {
  name: string;
  description: string;
  tenantId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: 'active' | 'archived' | 'completed';
  totalTrackedMinutes: number;
  timeEntries: ITimeEntry[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    minutes: { type: Number, required: true },
    description: { type: String, default: '' },
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    totalTrackedMinutes: { type: Number, default: 0 },
    timeEntries: [timeEntrySchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ tenantId: 1, status: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
