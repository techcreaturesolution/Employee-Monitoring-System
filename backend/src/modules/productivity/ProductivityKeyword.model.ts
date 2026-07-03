import mongoose, { Schema, Document } from "mongoose";

export interface IProductivityKeyword extends Document {
  tenantId: mongoose.Types.ObjectId;
  keyword: string;
  category: "productive" | "neutral" | "unproductive";
  type: "app" | "url" | "window_title";
  matchType: "exact" | "contains" | "regex";
  priority: number; // 1-10, higher = checked first
  enabled: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productivityKeywordSchema = new Schema<IProductivityKeyword>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    keyword: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["productive", "neutral", "unproductive"],
      required: true,
    },
    type: {
      type: String,
      enum: ["app", "url", "window_title"],
      default: "app",
    },
    matchType: {
      type: String,
      enum: ["exact", "contains", "regex"],
      default: "contains",
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for fast lookups
productivityKeywordSchema.index({ tenantId: 1, enabled: 1, priority: -1 });
productivityKeywordSchema.index({ tenantId: 1, category: 1 });
productivityKeywordSchema.index({ tenantId: 1, keyword: 1 }, { unique: true });

const ProductivityKeyword = mongoose.model<IProductivityKeyword>(
  "ProductivityKeyword",
  productivityKeywordSchema
);

export { ProductivityKeyword };
