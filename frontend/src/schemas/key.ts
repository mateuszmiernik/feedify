import { z } from 'zod';

export const issuedApiKeySchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    apiKey: z.string().regex(/^[0-9a-f]{64}$/, 'Unexpected API key format.'),
})

export type IssuedApiKey = z.infer<typeof issuedApiKeySchema>;