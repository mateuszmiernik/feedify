import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";


export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Missing or invalid Authorization header.' });
        return;
    }

    const token = authHeader.slice('Bearer '.length);

    try {
        const { userId } = verifyAccessToken(token);
        req.userId = userId;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}
