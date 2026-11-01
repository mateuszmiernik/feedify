import type { Request, Response } from 'express';
import { createFeedbackSchema } from './feedback.schemas.js';
import { prisma } from '../../prisma.js';

export async function createFeedback(req: Request, res: Response): Promise<void> {
    const projectId = req.feedbackProjectId;

    if (!projectId) {
        res.status(401).json({ message: 'Missing or invalid API key.'});
        return;
    }
    
    const result = createFeedbackSchema.safeParse(req.body);

    if (!result.success) {
        res.status(422).json({
            message: result.error.issues[0]?.message ?? 'Invalid input.'
        });
        return;
    }

    try {
        const saved = await prisma.feedback.create({
            data: {
                type: result.data.type,
                email: result.data.email,
                message: result.data.message,
                projectId
            },
            select: { id: true }
        });

        res.status(201).json({ id: saved.id });
    } catch {
        res.status(500).json({ message: 'Could not save feedback.' });
    }
}