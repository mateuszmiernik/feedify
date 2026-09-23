import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';

export function HomePage() {
    return (
        <div className='flex min-h-screen flex-col bg-background text-foreground'>
            <header className='border-b border-border'>
                <div className='flex max-w-5xl items-center justify-between px-6 py-4'>
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

            </main>

            <footer>

            </footer>
        </div>
    )
}