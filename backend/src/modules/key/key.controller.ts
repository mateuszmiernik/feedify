import type { Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { generateApiKey, hashApiKey } from '../../utils/api-key.js';
import { createApiKeySchema } from './key.schemas.js';

export async function createApiKey(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: 'Not authenticated.' });
        return;
    }

    const result = createApiKeySchema.safeParse(req.body);
    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    try {
        const project = await prisma.project.findFirst({
            where: {
                id: result.data.projectId,
                userId: req.userId
            },
            select: { id: true }
        });

        if (!project) {
            res.status(404).json({ message: 'Project not found.'});
            return;
        }

        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);

        const saved = await prisma.apiKey.create({
            data: {
                keyHash,
                projectId: project.id
            },
            select: {
                id: true,
                projectId: true,
                createdAt: true
            }
        });

        res.setHeader('Cache-Control', 'no-store');
        res.status(201).json({
            id: saved.id,
            projectId: saved.projectId,
            createdAt: saved.createdAt,
            apiKey
        });
    } catch {
        res.status(500).json({ message: 'Could not create API key. '});
    }
}