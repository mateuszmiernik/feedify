import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { createApiKey } from './key.controller.js';

export const keyRouter = Router();

keyRouter.post('/', requireAuth, createApiKey);