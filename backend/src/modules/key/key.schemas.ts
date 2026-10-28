import { z } from 'zod';

export const createApiKeySchema = z.strictObject({
    projectId: z.uuid('Enter a valid project ID.')
});