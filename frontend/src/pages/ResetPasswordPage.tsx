import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setPending(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'This reset link is invalid or has expired.');
                setPending(false);
                return;
            }

            setMessage(data.message);
            setPending(false);

            setTimeout(() => navigate('/login', { replace: true }), 2000);
        } catch {
            setError('Cannot reach the server.');
            setPending(false);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
                <p className="text-destructive">This reset link is incomplete.</p>
                <Link to="/forgot-password" className="text-sm underline underline-offset-4 hover:text-primary">
                    Request a new link
                </Link>
            </div>
        );
    }

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Set a new password
                    </CardTitle>
                    <CardDescription className="text-sm">
                        This link is valid for 30 minutes.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div
                            role="alert"
                            className='mb-4 border border-destructive/20 bg-destructive/15 p-3 text-center text-sm font-medium text-destructive'
                        >
                            <p>{error}</p>
                            <Link
                                to="/forgot-password"
                                className="mt-1 inline-block underline underline-offset-4"
                            >
                                Request a new link
                            </Link>
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mb-4 border border-success/20 bg-success/15 p-3 text-center text-sm font-medium text-success"
                        >
                            {message} Redirecting to log in...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor="password" className='text-sm font-medium'>New password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor="confirmPassword" className='text-sm font-medium'>
                                Confirm new password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <Button type='submit' disabled={pending} className='mt-2 w-full'>
                            {pending ? 'Saving...' : 'Reset password'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
                    <Link to="/forgot-password" className="ml-1 underline underline-offset-4 hover:text-primary">
                        Request a new link
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}