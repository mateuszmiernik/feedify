import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes.js';

export const app = express();

app.use(helmet());

app.use(
    cors({
        origin: process.env['FRONTEND_URL'],
        credentials: true
    })
);

app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Health Check' });
});