import mongoose, { Schema, Document } from 'mongoose';

export interface IBreak {
  startTime: Date;
  endTime: Date;
  duration: number;
  reason: string;
}

export interface IPunchRecord {
  time: Date;
  ip: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  screenshotUrl: string;
  method: 'agent' | 'web' | 'manual';
}

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  date: string;
  punchIn: IPunchRecord;
  punchOut: IPunchRecord;
  breaks: IBreak[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  overtimeMinutes: number;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave';
  notes: string;
  approvedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const punchRecordSchema = new Schema<IPunchRecord>(
  {
    time: { type: Date, required: true },
    ip: { type: String, default: '' },
    location: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
      address: { type: String, default: '' },
    },
    screenshotUrl: { type: String, default: '' },
    method: {
      type: String,
      enum: ['agent', 'web', 'manual'],
      default: 'web',
    },
  },
  { _id: false }
);

const breakSchema = new Schema<IBreak>(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number, default: 0 },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    date: { type: String, required: true },
    punchIn: { type: punchRecordSchema },
    punchOut: { type: punchRecordSchema },
    breaks: [breakSchema],
    totalWorkMinutes: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'late', 'on-leave'],
      default: 'present',
    },
    notes: { type: String, default: '' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: 1 });
attendanceSchema.index({ tenantId: 1, userId: 1, date: -1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
