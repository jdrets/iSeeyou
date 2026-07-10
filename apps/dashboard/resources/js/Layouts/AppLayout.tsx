import { PropsWithChildren } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    ScrollText,
    User,
    LogOut,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PageProps } from '@/types';

type NavItem = {
    label: string;
    href: string;
    routeName: string;
    icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        routeName: 'dashboard',
        icon: LayoutDashboard,
    },
    {
        label: 'Logs',
        href: '/logs',
        routeName: 'logs',
        icon: ScrollText,
    },
];

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<PageProps>().props;

    return (
        <div className="relative min-h-screen">
            <div className="ambient-bg" aria-hidden="true">
                <div className="ambient-orb" />
            </div>

            <aside className="glass-strong fixed bottom-3 left-3 top-3 z-20 flex w-56 flex-col rounded-lg">
                <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cta/20">
                        <Activity className="h-4 w-4 text-cta" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                        SeeYou
                    </span>
                </div>

                <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2 pt-1">
                    {navItems.map(({ label, routeName, icon: Icon }) => {
                        const isActive = route().current(routeName);
                        return (
                            <Link
                                key={routeName}
                                href={route(routeName as Parameters<typeof route>[0])}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                                    isActive
                                        ? 'glass-nav-active text-cta'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                                )}
                            >
                                <Icon
                                    className={cn(
                                        'h-4 w-4 shrink-0',
                                        isActive
                                            ? 'text-cta'
                                            : 'text-muted-foreground',
                                    )}
                                />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="shrink-0 p-3">
                    <div className="mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase text-foreground">
                            {auth.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">
                                {auth.user.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                                {auth.user.email}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Link
                            href={route('profile.edit')}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
                        >
                            <User className="h-3.5 w-3.5" />
                            Profile
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-destructive/20 hover:text-red-400"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Logout
                        </Link>
                    </div>
                </div>
            </aside>

            <div className="relative z-10 ml-[calc(14rem+0.75rem)] min-h-screen">
                <main className="min-h-screen overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
