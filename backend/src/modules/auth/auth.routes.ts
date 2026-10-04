import { Router } from 'express';
import { login, register, me } from './auth.controller.js';
import { requireAuth } from '../../middlewares/require-auth.js';


export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);