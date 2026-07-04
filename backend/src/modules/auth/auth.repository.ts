import mongoose, { ClientSession } from "mongoose";
import { User, IUser } from "../users/User.model";
import { Company } from "../companies/Company.model";

export class AuthRepository {
    // ===========================================================================
    // USER LOOKUPS
    // ===========================================================================

    async findUserById(
        userId: string,
        session?: ClientSession
    ): Promise<IUser | null> {
        return User.findById(userId).session(session || null);
    }

    async findUserByEmail(
        email: string,
        session?: ClientSession
    ): Promise<IUser | null> {
        return User.findOne({
            email: email.toLowerCase().trim(),
        }).session(session || null);
    }

    async findUserByRefreshToken(
        refreshToken: string
    ): Promise<IUser | null> {
        return User.findOne({ refreshToken });
    }

    // ===========================================================================
    // COMPANY LOOKUPS
    // ===========================================================================

    async findCompanyById(companyId: string, session?: ClientSession) {
        return Company.findById(companyId).session(session || null);
    }

    async companyExists(email: string): Promise<boolean> {
        const exists = await Company.exists({
            email: email.toLowerCase().trim(),
        });

        return !!exists;
    }

    // ===========================================================================
    // CREATE
    // ===========================================================================

    async createCompany(
        data: Record<string, any>,
        session?: ClientSession
    ) {
        const [company] = await Company.create([data], {
            session,
        });

        return company;
    }

    async createUser(
        data: Record<string, any>,
        session?: ClientSession
    ) {
        const [user] = await User.create([data], {
            session,
        });

        return user;
    }

    // ===========================================================================
    // LOGIN / SECURITY
    // ===========================================================================

    async updateLastLogin(
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            $set: {
                lastLogin: new Date(),
                lastLoginIp: ipAddress,
                lastUserAgent: userAgent,
            },
        });
    }

    async updateRefreshToken(
        userId: string,
        refreshToken: string | null
    ): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            $set: {
                refreshToken,
            },
        });
    }

    async incrementFailedLogin(
        userId: string,
        maxAttempts = 5,
        lockMinutes = 30
    ): Promise<number> {
        const user = await User.findById(userId);

        if (!user) {
            return 0;
        }

        const attempts = (user.failedLoginAttempts || 0) + 1;

        const update: Record<string, any> = {
            failedLoginAttempts: attempts,
        };

        if (attempts >= maxAttempts) {
            update.lockUntil = new Date(
                Date.now() + lockMinutes * 60 * 1000
            );
        }

        await User.findByIdAndUpdate(userId, {
            $set: update,
        });

        return attempts;
    }

    async resetFailedLogin(userId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            $set: {
                failedLoginAttempts: 0,
                lockUntil: null,
            },
        });
    }

    async isAccountLocked(userId: string): Promise<boolean> {
        const user = await User.findById(userId).select("lockUntil");

        if (!user?.lockUntil) {
            return false;
        }

        return user.lockUntil > new Date();
    }

    // ===========================================================================
    // PROFILE
    // ===========================================================================

    async updateProfile(
        userId: string,
        data: Partial<IUser>
    ): Promise<IUser | null> {
        return User.findByIdAndUpdate(userId, data, {
            new: true,
            runValidators: true,
        });
    }

    async updateAvatar(
        userId: string,
        avatar: string
    ): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            avatar,
        });
    }

    async updatePassword(
        userId: string,
        password: string
    ): Promise<void> {
        const user = await User.findById(userId);

        if (!user) return;

        user.password = password;
        user.refreshToken = undefined;

        await user.save();
    }

    // ===========================================================================
    // EMAIL VERIFICATION
    // ===========================================================================

    async verifyEmail(userId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            $set: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });
    }

    // ===========================================================================
    // SESSION
    // ===========================================================================

    async logout(userId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            $unset: {
                refreshToken: 1,
            },
        });
    }

    // ===========================================================================
    // TRANSACTIONS
    // ===========================================================================

    async startTransaction() {
        const session = await mongoose.startSession();

        session.startTransaction();

        return session;
    }

    async commitTransaction(session: ClientSession) {
        await session.commitTransaction();
        session.endSession();
    }

    async abortTransaction(session: ClientSession) {
        await session.abortTransaction();
        session.endSession();
    }
}

export default new AuthRepository();