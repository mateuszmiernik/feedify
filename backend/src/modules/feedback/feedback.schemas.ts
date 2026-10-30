import { z } from 'zod';

export const createFeedbackSchema = z.strictObject({
    type: z.enum(['idea', 'bug', 'other']),
    email: z.string()
        .trim()
        .max(100, 'Email must be at most 254 characters.')
        .pipe(z.email('Enter a valid email address.')),
    message: z.string()
        .trim()
        .min(1, 'Message is required.')
        .max(5000, 'Message must be at most 5000 characters.')
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;