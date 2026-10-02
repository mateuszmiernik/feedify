import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';

export function HomePage() {
    const features = [
        {
            title: 'One API for everything',
            description: 'Website, mobile app or a game - send feedback with a single HTTP request.'
        },
        {
            title: 'Images go straight to storage',
            description: 'Attachments land in S3 and only the link stays in your database.',
        },
        {
            title: 'Data you can trust',
            description: 'Passwords hashed with bcrypt, reset tokens stored as hashes with an expiry.',
        },
    ];

    return (
        <div className='flex min-h-screen flex-col bg-background text-foreground'>
            <header className='border-b border-border'>
                <div className='mx-auto flex max-w-5xl items-center justify-between px-6 py-4'>
                    <Link to='/' className='text-lg font-semibold'>
                        Feedify
                    </Link>

                    <nav className='flex items-center gap-2'>
                        <Link to='/' className={buttonVariants({ variant: "ghost" })}>
                            Log In
                        </Link>
                        <Link to='/register' className={buttonVariants()}>
                            Sign Up
                        </Link>
                    </nav>
                </div>
            </header>

            <main className='mx-auto w-full max-w-5xl flex-1'>
                <section className='py-24 text-center'>
                    <h1 className='mx-auto max-w-2xl text-4xl'>
                        Collect user feedback in one place
                    </h1>
                    <p className='mx-auto mt-6 max-w-xl text-lg text-muted-foreground'>
                        Send an email, a title, a message and a screenshot in one request.
                        The API handles the rest.
                    </p>
                    <div className='mt-10 flex justify-center gap-3'>
                        <Link to='/register' className={buttonVariants({ variant: "default" })}>
                            Get started free
                        </Link>
                        <Link to='/' className={buttonVariants({ variant: "outline" })}>
                            See what it does
                        </Link>
                    </div>
                </section>

                <section className='grid gap-6 pb-24 sm:grid-cols-3'>
                    {features.map((feature) => (
                        <div key={feature.title} className='border border-border bg-card p-6'>
                            <h2 className='text-base font-semibold'>
                                {feature.title}
                            </h2>
                            <p className='mt-2 text-sm text-muted-foreground'>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </section>
            </main>

            <footer className='border-t border-border'>
                <div className='mx-auto max-w-5xl px-6 py-6 text-sm text-muted-foreground'>
                    {new Date().getFullYear()} Feedify
                </div>
            </footer>
        </div>
    )
}