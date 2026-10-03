import type { Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { registerSchema } from './auth.schemas.js'; 
import { hashPassword } from '../../utils/password.js';


export async function register(req: Request, res: Response): Promise<void> {
    console.log(req.body);

    const result = registerSchema.safeParse(req.body);
    console.log(result);

    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    const email = result.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({
        where: { email: email}
    });

    if (existing) {
        res.status(409).json({ message: 'An account with this email already exists.' });
        return;
    }

    const passwordHash = await hashPassword(result.data.password);
    
    try {
        const user = await prisma.user.create({
            data: { email: email, password: passwordHash },
            select: { id: true, email: true, createdAt: true}
        });

        res.status(201).json(user);
    } catch {
        res.status(409).json({ message: 'An account with this email already exists.' });
    }
}