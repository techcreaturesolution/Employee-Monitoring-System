import { Schema, model, Types, Document } from "mongoose";

export interface IAuditLog extends Document {
    tenantId: Types.ObjectId;

    userId?: Types.ObjectId;

    action: string;

    module: string;

    resourceId?: Types.ObjectId;

    resourceType?: string;

    description?: string;

    before?: Record<string, any>;

    after?: Record<string, any>;

    ip?: string;

    userAgent?: string;

    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: "Tenant",
            required: true,
            index: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        action: {
            type: String,
            required: true,
            index: true,
        },

        module: {
            type: String,
            required: true,
            index: true,
        },

        resourceId: {
            type: Schema.Types.ObjectId,
            index: true,
        },

        resourceType: {
            type: String,
        },

        description: String,

        before: Schema.Types.Mixed,

        after: Schema.Types.Mixed,

        ip: String,

        userAgent: String,
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

auditLogSchema.index({
    tenantId: 1,
    module: 1,
    createdAt: -1,
});

auditLogSchema.index({
    userId: 1,
    createdAt: -1,
});

export const AuditLog = model<IAuditLog>(
    "AuditLog",
    auditLogSchema
);