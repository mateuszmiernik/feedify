import { z } from 'zod';

export const projectFormSchema = z.object({
    name: z.string()
        .trim()
        .min(1, 'Project name is required')
        .max(100, 'Project name must be at most 100 characters.'),
    website: z.string()
        .trim()
        .max(100, 'Website must be at most 100 characters.')
        .refine((value) => {
            if (value === '') return true;
            try{
                const url = new URL(value);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch {
                return false;
            }
        }, 'Enter an HTTP or HTTPS URL.'),
    description: z.string()
        .trim()
        .max(2000, 'Description must be at most 2000 characters.')
});

export const createdProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

export const errorResponseSchema = z.object({ message: z.string() });

export type CreatedProject = z.infer<typeof createdProjectSchema>;