import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes.js';
import { projectRouter } from './modules/project/project.routes.js';
import { env } from './config/env.js';
import { keyRouter } from './modules/key/key-routes.js';

export const app = express();

app.use(helmet());

app.use(
    cors({
        origin: env['FRONTEND_URL'],
        credentials: true
    })
);

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/project', projectRouter);
app.use('/api/key', keyRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Health Check' });
});