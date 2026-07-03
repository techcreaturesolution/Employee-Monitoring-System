import mongoose, { Schema, Document } from "mongoose";

export interface ILocationLog extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  source: "mobile" | "web" | "agent";
  workMode: "office" | "wfh" | "field";
  isInsideGeofence: boolean;
  batteryLevel: number;
  networkType: string;
  timestamp: Date;
}

const locationLogSchema = new Schema<ILocationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: 0 },
    address: { type: String, default: "" },
    source: {
      type: String,
      enum: ["mobile", "web", "agent"],
      default: "mobile",
    },
    workMode: {
      type: String,
      enum: ["office", "wfh", "field"],
      default: "office",
    },
    isInsideGeofence: { type: Boolean, default: false },
    batteryLevel: { type: Number, default: -1 },
    networkType: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

locationLogSchema.index({ userId: 1, timestamp: -1 });
locationLogSchema.index({ tenantId: 1, timestamp: -1 });
locationLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
locationLogSchema.index({ latitude: 1, longitude: 1 });

const LocationLog = mongoose.model<ILocationLog>(
  "LocationLog",
  locationLogSchema
);

export { LocationLog };
