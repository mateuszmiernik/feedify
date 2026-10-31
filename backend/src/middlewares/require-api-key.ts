import type { Request, Response, NextFunction } from 'express';
import { hashApiKey } from '../utils/api-key.js';
import { prisma } from '../prisma.js';

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    const apiKey = req.get('X-API-Key');

    if (!apiKey || !/^[0-9a-f]{64}$/.test(apiKey)) {
        res.status(401).json({ message: 'Missing or invalid API key.'});
        return;
    }

    try {
        const keyHash = hashApiKey(apiKey);

        const storedKey = await prisma.apiKey.findUnique({
            where: { keyHash },
            select: { projectId: true }
        })

        if (!storedKey) {
            res.status(401).json({ message: 'Missing or invalid API key.'});
            return;
        }
    } catch {
        res.status(500).json({ message: 'Could not verify API key'});
        return;
    }

    next();
}