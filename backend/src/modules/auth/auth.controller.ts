import type { Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/jwt.js';


export async function register(req: Request, res: Response): Promise<void> {
    const result = registerSchema.safeParse(req.body);
    console.log(result);

    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    const email = result.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({
        where: { email: email }
    });

    if (existing) {
        res.status(409).json({ message: 'An account with this email already exists.' });
        return;
    }

    const passwordHash = await hashPassword(result.data.password);

    try {
        const user = await prisma.user.create({
            data: { email: email, password: passwordHash },
            select: { id: true, email: true, createdAt: true }
        });

        res.status(201).json(user);
    } catch {
        res.status(409).json({ message: 'An account with this email already exists.' });
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    const result = loginSchema.safeParse(req.body);

    console.log(req.body)

    if (!result.success) {
        res.status(422).json({ message: result.error.issues[0]?.message ?? 'Invalid input.' });
        return;
    }

    const email = result.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
    }

    const passwordOK = await comparePassword(result.data.password, user.password);

    if (!passwordOK) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
    }

    const token = signAccessToken(user.id);
    res.json({ token });
}

export async function me(req: Request, res: Response): Promise<void> {
        if (!req.userId) {
            res.status(401).json({ message: 'Not authenticated.' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId},
            select: { id: true, email: true, createdAt: true }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.json(user);
    }