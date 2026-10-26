import type { Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { createProjectSchema } from '../auth/auth.schemas.js';

export async function createProject (req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: 'Not authenticated. '});
        return;
    }

    const result = createProjectSchema.safeParse(req.body);

    if (!result.success) {
        res.status(422).json({ 
            message: result.error.issues[0]?.message ?? 'Invalid input.'
        });
        return;
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

        const saved = await prisma.project.create({
            data: {
                name: result.data.name,
                website: result.data?.website,
                description: result.data?.description,
                userId: owner.id
            },
            select: {
                id: true,
                name: true,
                website: true,
                description: true,
                createdAt: true
            }
        });

        res.status(201).json({
            id: saved.id,
            name: saved.name,
            website: saved.website,
            description: saved.description,
            createdAt: saved.createdAt
        });
    } catch (error) {
        console.error("error: ", error); 
        res.status(500).json({ message: 'Could not create project.' });
    }
}