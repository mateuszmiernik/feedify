import type { Request, Response } from 'express';
import { createProjectSchema } from '../auth/auth.schemas.js';
import { prisma } from '../../prisma.js';

export async function createProject (req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: 'Not authenticated. '});
        return;
    }

    const result = createProjectSchema.safeParse(req.body);

    if (!result.success) {
        res.status(422).json({ 
            message: result.error.issues[0]?.message ?? 'Invalid input.'
        })
    }

    try {
        const owner = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true }
        });

        if (!owner) {
            res.status(401).json({ message: 'Not authenticated. '});
            return;
        }
    }

}