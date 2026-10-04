import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loginSchema } from '@/schemas/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        password?: string;
    }>({});
    const [loggedInAs, setLoggedInAs] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setLoggedInAs('');
        setPending(true);

        const result = loginSchema.safeParse({ email, password });

        if (!result.success) {
            const formattedErrors: Record<string, string> = {};

            for (const issue of result.error.issues) {
                const fieldName = issue.path[0];
                formattedErrors[String(fieldName)] = issue.message;
            }

            setFieldErrors(formattedErrors);
            setPending(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: result.data.email,
                    password: result.data.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Invalid email or password.');
                setPending(false);
                return;
            }

            setEmail('');
            setPassword('');
            setLoggedInAs(data.email);
            setPending(false);

        } catch (err) {
            setError('Cannot reach the server.')
        }

    }


    return (
        <div className='flex flex-col min-h-screen items-center justify-center bg-background p-4'>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Log in to your account
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div
                            role="alert"
                            className='mb-4 border border-destructive/20 bg-destructive/15 p-3 text-center text-sm font-medium text-destructive'
                        >
                            {error}
                        </div>
                    )}

                    {loggedInAs && (
                        <div
                            role="status"
                            className="mb-4 border border-success/20 bg-success/15 p-3 text-center text-sm font-medium text-success"
                        >
                            Logged in as {loggedInAs}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor="email" className='text-sm font-medium'>Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={Boolean(fieldErrors.email)}
                                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                            />
                            {fieldErrors.email && (
                                <p id="login-email-error" role="alert" className="mt-1 text-xs font-medium text-destructive">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                            />
                            {fieldErrors.password && (
                                <p id="login-password-error" role="alert" className="mt-1 text-xs font-medium text-destructive">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        <Button type='submit' disabled={pending} className='mt-2 w-full'>
                            {pending ? 'Logging in...' : 'Log in'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
                    Don't have an account?
                    <Link to="/register" className="ml-1 underline underline-offset-4 hover:text-primary">
                        Sign up
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}