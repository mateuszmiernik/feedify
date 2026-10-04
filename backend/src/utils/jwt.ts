import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId: string): string {
    const options: jwt.SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }

    return jwt.sign({ userId }, env.JWT_SECRET, options)
}

export function verifyAccessToken(token: string): { userId: string } {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    if (typeof payload.userId !== 'string') {
        throw new Error('Invalid token payload.');
    }

    return { userId: payload.userId };
}