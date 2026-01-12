import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'freezy-bites-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
    userId: number;
    email: string;
}

/**
 * Sign a JWT token with user data
 */
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 */
export function getTokenFromHeader(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

/**
 * Get authenticated user from request
 * Returns user payload if authenticated, null otherwise
 */
export function getAuthUser(request: NextRequest): JwtPayload | null {
    const token = getTokenFromHeader(request);
    if (!token) return null;
    return verifyToken(token);
}
