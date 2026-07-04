import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";
import { IUser } from "../modules/users/User.model";

export interface TokenPayload {
    userId: string;
    tenantId: string;
    role: string;
}

class TokenService {
    /**
     * Build JWT payload
     */
    private buildPayload(user: IUser): TokenPayload {
        return {
            userId: user._id.toString(),
            tenantId: user.tenantId.toString(),
            role: user.role,
        };
    }

    /**
     * Generate Access Token
     */
    generateAccessToken(user: IUser): string {
        return jwt.sign(
            this.buildPayload(user),
            config.jwt.secret,
            {
                expiresIn: config.jwt.expire,
            } as SignOptions
        );
    }

    /**
     * Generate Refresh Token
     */
    generateRefreshToken(user: IUser): string {
        return jwt.sign(
            this.buildPayload(user),
            config.jwt.refreshSecret,
            {
                expiresIn: config.jwt.refreshExpire,
            } as SignOptions
        );
    }

    /**
     * Generate Both Tokens
     */
    generateTokenPair(user: IUser) {
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: this.generateRefreshToken(user),
        };
    }

    /**
     * Verify Access Token
     */
    verifyAccessToken(token: string): TokenPayload {
        return jwt.verify(
            token,
            config.jwt.secret
        ) as TokenPayload;
    }

    /**
     * Verify Refresh Token
     */
    verifyRefreshToken(token: string): TokenPayload {
        return jwt.verify(
            token,
            config.jwt.refreshSecret
        ) as TokenPayload;
    }

    /**
     * Decode Token
     * (without verification)
     */
    decodeToken(token: string): JwtPayload | null {
        const decoded = jwt.decode(token);

        if (!decoded || typeof decoded === "string") {
            return null;
        }

        return decoded;
    }

    /**
     * Generate Email Verification Token
     */
    generateEmailVerificationToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    /**
     * Generate Password Reset Token
     */
    generatePasswordResetToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    /**
     * Generate Generic Secure Token
     */
    generateRandomToken(length = 64): string {
        return crypto.randomBytes(length).toString("hex");
    }

    /**
     * Generate OTP
     */
    generateOTP(length = 6): string {
        const digits = "0123456789";

        let otp = "";

        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }

        return otp;
    }

    /**
     * Cookie Options
     */
    getCookieOptions() {
        return {
            httpOnly: true,
            secure: config.nodeEnv === "production",
            sameSite: "lax" as const,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };
    }

    /**
     * Refresh Cookie Options
     */
    getRefreshCookieOptions() {
        return {
            httpOnly: true,
            secure: config.nodeEnv === "production",
            sameSite: "lax" as const,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        };
    }
}

export const tokenService = new TokenService();