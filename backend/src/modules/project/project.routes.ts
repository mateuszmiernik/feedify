import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { createProject } from './project.controller.js';

export const projectRouter = Router();

projectRouter.post('/', requireAuth, createProject);