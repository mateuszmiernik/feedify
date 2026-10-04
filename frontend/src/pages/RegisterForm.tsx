import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import { registerSchema } from '@/schemas/auth';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError('');
    setMessage('');
    setFieldErrors({});
    setPending(true);

    const result = registerSchema.safeParse({ email, password, confirmPassword });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const fieldName = issue.path[0];
        if (fieldName) {
          formattedErrors[String(fieldName)] = issue.message;
        }
      }

      setFieldErrors(formattedErrors);
      setPending(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.data.email,
          password: result.data.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setMessage('Account created successfully.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot reach the server.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription className="text-sm">
            Enter your details below to create your new account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div
              role="alert"
              className="mb-4 border border-destructive/20 bg-destructive/15 p-3 text-center text-sm font-medium text-destructive"
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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-destructive"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-destructive"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined
                }
              />
              {fieldErrors.confirmPassword && (
                <p
                  id="confirmPassword-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-destructive"
                >
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="mt-2 w-full transition-shadow hover:shadow-lg hover:shadow-primary/40"
            >
              {pending ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-0 text-sm text-muted-foreground">
          Already have an account?
          <Link to="/login" className="ml-1 underline underline-offset-4 hover:text-primary">
            Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}