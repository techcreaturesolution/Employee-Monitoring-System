import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  deadline: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    deadline: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, done: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
