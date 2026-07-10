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
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
                {/* Brand */}
                <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cta/20">
                        <Activity className="h-4 w-4 text-cta" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                        SeeYou
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-0.5 p-2 pt-3">
                    {navItems.map(({ label, href, routeName, icon: Icon }) => {
                        const isActive = route().current(routeName);
                        return (
                            <Link
                                key={routeName}
                                href={route(routeName as Parameters<typeof route>[0])}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer',
                                    isActive
                                        ? 'bg-cta/15 text-cta'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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

                {/* User menu */}
                <div className="border-t border-sidebar-border p-3">
                    <div className="mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground uppercase">
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
                            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                        >
                            <User className="h-3.5 w-3.5" />
                            Profile
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-red-400 cursor-pointer"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Logout
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
