import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center pt-6 sm:justify-center sm:pt-0">
            <div className="ambient-bg" aria-hidden="true">
                <div className="ambient-orb" />
            </div>

            <div className="relative z-10">
                <Link href="/" className="flex cursor-pointer items-center gap-2">
                    <ApplicationLogo className="h-12 w-12 fill-current text-cta" />
                    <span className="text-lg font-semibold text-foreground">SeeYou</span>
                </Link>
            </div>

            <div className="glass-strong relative z-10 mt-6 w-full rounded-lg px-6 py-6 sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
