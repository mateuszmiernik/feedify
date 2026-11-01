import { Router } from 'express';
import { requireApiKey } from '../../middlewares/require-api-key.js';
import { createFeedback } from './feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', requireApiKey, createFeedback);