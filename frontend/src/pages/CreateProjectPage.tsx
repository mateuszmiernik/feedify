import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { IconArrowLeft } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { errorResponseSchema, projectFormSchema, createdProjectSchema } from '@/schemas/project';
import { getToken, clearToken } from '@/lib/token';


export default function CreateProjectPage() {
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [created, setCreated] = useState<CreatedProject | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (pending || created) return;
        setError('');

        const result = projectFormSchema.safeParse({ name, website, description });
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? 'Invalid input.');
            return;
        }

        const token = getToken();
        if (!token) {
            setError('Please log in before creating a project.');
            return;
        }

        setPending(true);
        try {
            const response = await fetch('/api/project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(result.data)
            });

            if (response.status === 401) {
                clearToken();
                setError('Your session is invalid or expired. Please log in again.');
                return;
            }

            const data: unknown = await response.json();
            if (!response.ok) {
                const parsedError = errorResponseSchema.safeParse(data);
                setError(parsedError.success
                    ? parsedError.data.message
                    : 'Could not create project.'
                );
                return;
            }

            const parsedProject = createdProjectSchema.safeParse(data);
            if (!parsedProject.success) {
                setError('Unexpected server response. Check whether the project was created before retrying.');
                return;
            }
            setCreated(parsedProject.data);
        } catch {
            setError('Could not confirm creation. Check the connection and whether the project was created before retrying.');
        } finally {
            setPending(false);
        }
    }

return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <Link to="/" className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} absolute left-3 top-3`}>
            <IconArrowLeft />
            Back to home
        </Link>
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Create project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {created ? (
                    <div role="status" className="space-y-2 text-sm">
                        <p>Project created: {created.name}</p>
                        <p className="break-all">Project ID: {created.id}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <fieldset disabled={pending} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="project-name">Name</Label>
                                <Input id="project-name" value={name}
                                    onChange={(event) => setName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-website">Website (optional)</Label>
                                <Input id="project-website" type="url" placeholder="https://example.com"
                                    value={website} onChange={(event) => setWebsite(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-description">Description (optional)</Label>
                                <textarea id="project-description" rows={4} value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                            </div>
                            <Button type="submit" className="w-full">
                                {pending ? 'Creating...' : 'Create project'}
                            </Button>
                        </fieldset>
                    </form>
                )}
                <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    Go to login
                </Link>
            </CardContent>
        </Card>
    </div>
)
}