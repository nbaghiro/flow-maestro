import { Link, useLocation } from "react-router-dom";
import {
    LayoutGrid,
    Key,
    Plug,
    FileText,
    History,
    Settings,
    User,
    Building,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useState } from "react";

interface NavItem {
    icon: any;
    label: string;
    path: string;
    badge?: string;
    section?: 'primary' | 'settings';
}

const navItems: NavItem[] = [
    // Primary navigation
    { icon: LayoutGrid, label: 'Workflows', path: '/', section: 'primary' },
    { icon: Key, label: 'Credentials', path: '/credentials', section: 'primary' },
    { icon: Plug, label: 'Integrations', path: '/integrations', section: 'primary' },
    { icon: FileText, label: 'Templates', path: '/templates', badge: 'Soon', section: 'primary' },
    { icon: History, label: 'Executions', path: '/executions', section: 'primary' },

    // Settings navigation
    { icon: Settings, label: 'Settings', path: '/settings', section: 'settings' },
    { icon: User, label: 'Account', path: '/account', section: 'settings' },
    { icon: Building, label: 'Workspace', path: '/workspace', badge: 'Pro', section: 'settings' },
];

export function AppSidebar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const primaryItems = navItems.filter(item => item.section === 'primary');
    const settingsItems = navItems.filter(item => item.section === 'settings');

    return (
        <aside
            className={cn(
                "h-screen bg-background border-r border-border flex flex-col transition-all duration-300",
                isCollapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo & Toggle */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            FM
                        </div>
                        <span className="font-semibold text-foreground">FlowMaestro</span>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
                        FM
                    </div>
                )}

                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {isCollapsed && (
                <div className="px-2 py-3 border-b border-border">
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-full p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            )}

            {/* Primary Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-2 space-y-1">
                    {primaryItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {/* Active indicator */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <Icon className={cn(
                                    "w-5 h-5 flex-shrink-0",
                                    isCollapsed && "mx-auto"
                                )} />

                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                        {item.label}
                                        {item.badge && ` (${item.badge})`}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Settings Navigation */}
            <div className="border-t border-border py-4">
                <div className="px-2 space-y-1">
                    {settingsItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <Icon className={cn(
                                    "w-5 h-5 flex-shrink-0",
                                    isCollapsed && "mx-auto"
                                )} />

                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}

                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                        {item.label}
                                        {item.badge && ` (${item.badge})`}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
