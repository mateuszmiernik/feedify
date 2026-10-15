import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setPending(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Something went wrong. Please try again.');
                setPending(false);
                return;
            }

            setMessage(data.message);
            setEmail('');
            setPending(false);
        } catch {
            setError('Cannot reach the server.');
            setPending(false);
        }
    };

    return (
        <div className='flex min-h-screen items-center justify-center bg-background p-4'>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Forgot your password?
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Type your email and we will send you a reset link.
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

                    {message && (
                        <div
                            role="status"
                            className="mb-4 border border-success/20 bg-success/15 p-3 text-center text-sm font-medium text-success"
                        >
                            {message}
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
                            />
                        </div>

                        <Button type='submit' disabled={pending} className='mt-2 w-full'>
                            {pending ? 'Sending...' : 'Send reset link'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
                    <Link to="/login" className="ml-1 underline underline-offset-4 hover:text-primary">
                        Back to log in
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}