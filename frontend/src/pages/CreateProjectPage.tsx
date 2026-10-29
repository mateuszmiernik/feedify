import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { IconArrowLeft } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreatedProject } from '@/schemas/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { errorResponseSchema, projectFormSchema, createdProjectSchema } from '@/schemas/project';
import { getToken, clearToken } from '@/lib/token';
import { issuedApiKeySchema } from '@/schemas/key';
import type { IssuedApiKey } from '@/schemas/key';

export default function CreateProjectPage() {
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [created, setCreated] = useState<CreatedProject | null>(null);
    const [issuedKey, setIssuedKey] = useState<IssuedApiKey | null>(null);
    const [keyPending, setKeyPending] = useState(false);
    const [keyError, setKeyError] = useState('');

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

    async function handleGenerateKey() {
        if (!created || keyPending || issuedKey) return;
        setKeyError('');

        const token = getToken();
        if (!token) {
            setKeyError('Please log in before generating an API key.');
            return;
        }

        const projectId = created.id;
        setKeyPending(true);

        try {
            const response = await fetch('/api/key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ projectId })
            });

            if (response.status === 401) {
                clearToken();
                setKeyError('Your session is invalid or expired. Please log in again.');
                return;
            }

            const data: unknown = await response.json();

            if (!response.ok) {
                const parsedError = errorResponseSchema.safeParse(data);
                setKeyError(parsedError.success ? parsedError.data.message : 'Could not generate API key.');
                return;
            }

            const parsedKey = issuedApiKeySchema.safeParse(data);
            if (!parsedKey.success || parsedKey.data.projectId !== projectId) {
                setKeyError('Could not verify the issued key. Check the request result before retrying; another request may create another key.');
                return;
            }

            setIssuedKey(parsedKey.data);
        } catch {
            setKeyError('Could not confirm key creation. Check the connection and request result before retrying; a key may already have been created.');
        } finally {
            setKeyPending(false);
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
                        <div className='className="space-y-4 text-sm'>
                            <div role="status" className="space-y-2">
                                <p>Project created: {created.name}</p>
                                <p className="break-all">Project ID: {created.id}</p>
                            </div>

                            {keyError && (
                                <p role="alert" className="text-destructive">{keyError}</p>
                            )}

                            {issuedKey ? (
                                <div className="space-y-2">
                                    <p role="status">API key generated. Copy it now.</p>
                                    <Label htmlFor="issued-api-key">API key</Label>
                                    <Input
                                        id="issued-api-key"
                                        readOnly
                                        value={issuedKey.apiKey}
                                        onFocus={(event) => event.currentTarget.select()}
                                        className="font-mono"
                                    />
                                    <p className="text-muted-foreground">
                                        Store this secret securely on your application's backend.
                                        Feedify cannot show it again after you leave this page.
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    disabled={keyPending}
                                    onClick={handleGenerateKey}
                                >
                                    {keyPending ? 'Generating...' : 'Generate API key'}
                                </Button>
                            )}
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