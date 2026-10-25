import { z } from 'zod';

export const registerSchema = z.object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.')
});

export type RegisterInput = z.infer<typeof registerSchema>;


export const loginSchema = z.object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.')
})

export type LoginInput = z.infer<typeof loginSchema>;


export const forgotPasswordSchema = z.object({
    email: z.email('Enter a valid email address.'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

function emptyStringToUndefined(value: unknown): unknown {
    if (typeof value === 'string' && value.trim() === '') {
        return undefined;
    }
    return value;
}

export const createProjectSchema = z.strictObject({
    name: z.string()
        .trim()
        .min(1, 'Project name is required.')
        .max(100, 'Project name must be at most 100 characters.'),

    website: z.preprocess(
        emptyStringToUndefined,
        z.string()
            .trim()
            .max(100, 'Website must be at most 100 characters.')
            .pipe(z.url({ protocol: /^https?$/ }))
            .optional()
    ).transform((value) => value ?? null),

    description: z.preprocess(
        emptyStringToUndefined,
        z.string()
            .trim()
            .max(2000, 'Description must be at most 2000 characters.')
            .optional()
    ).transform((value) => value ?? null)
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>;