import { Types } from "mongoose";
import { AuditLog } from "../modules/audit/AuditLog.model";
import { logger } from "../utils/logger";

interface AuditEntry {
    tenantId: Types.ObjectId | string;

    userId?: Types.ObjectId | string;

    action: string;

    module: string;

    resourceId?: Types.ObjectId | string;

    resourceType?: string;

    description?: string;

    before?: unknown;

    after?: unknown;

    ip?: string;

    userAgent?: string;
}

class AuditService {
    async log(entry: AuditEntry): Promise<void> {
        try {
            await AuditLog.create({
                tenantId: entry.tenantId,

                userId: entry.userId,

                action: entry.action,

                module: entry.module,

                resourceId: entry.resourceId,

                resourceType: entry.resourceType,

                description: entry.description,

                before: entry.before,

                after: entry.after,

                ip: entry.ip,

                userAgent: entry.userAgent,
            });
        } catch (error) {
            logger.error("Failed to write audit log", error);
        }
    }

    async employeeCreated(
        tenantId: Types.ObjectId | string,
        adminId: Types.ObjectId | string,
        employee: any,
        ip?: string,
        userAgent?: string
    ) {
        await this.log({
            tenantId,

            userId: adminId,

            module: "Employee",

            action: "CREATE",

            resourceId: employee._id,

            resourceType: "User",

            description: `Employee "${employee.name}" created.`,

            after: employee,

            ip,

            userAgent,
        });
    }

    async employeeUpdated(
        tenantId: Types.ObjectId | string,
        adminId: Types.ObjectId | string,
        before: any,
        after: any,
        ip?: string,
        userAgent?: string
    ) {
        await this.log({
            tenantId,

            userId: adminId,

            module: "Employee",

            action: "UPDATE",

            resourceId: after._id,

            resourceType: "User",

            before,

            after,

            ip,

            userAgent,
        });
    }

    async employeeDeleted(
        tenantId: Types.ObjectId | string,
        adminId: Types.ObjectId | string,
        employee: any,
        ip?: string,
        userAgent?: string
    ) {
        await this.log({
            tenantId,

            userId: adminId,

            module: "Employee",

            action: "DELETE",

            resourceId: employee._id,

            resourceType: "User",

            before: employee,

            ip,

            userAgent,
        });
    }

    async custom(entry: AuditEntry) {
        return this.log(entry);
    }
}

export const auditService = new AuditService();