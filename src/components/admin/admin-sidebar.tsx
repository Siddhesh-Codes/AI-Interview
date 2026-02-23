'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Briefcase,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminStore } from '@/stores/admin-store';
import { signOut } from 'next-auth/react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function AdminSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, collapseSidebar } = useAdminStore();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/admin/login');
  };

  const navItems: NavItem[] = [
    { title: 'Dashboard', href: `/${orgSlug}`, icon: LayoutDashboard },
    { title: 'Interviews', href: `/${orgSlug}/interviews`, icon: MessageSquare },
    { title: 'Questions', href: `/${orgSlug}/questions`, icon: FileText },
    { title: 'Candidates', href: `/${orgSlug}/candidates`, icon: Users },
    { title: 'Job Roles', href: `/${orgSlug}/job-roles`, icon: Briefcase },
    { title: 'Audit Log', href: `/${orgSlug}/audit`, icon: Shield },
    { title: 'Team', href: `/${orgSlug}/team`, icon: Users },
    { title: 'Settings', href: `/${orgSlug}/settings`, icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === `/${orgSlug}`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/[0.06] bg-[#0d0d14] transition-all duration-300',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!sidebarCollapsed && (
          <Link href={`/${orgSlug}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <span className="text-sm font-semibold text-white">Interview</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => collapseSidebar(!sidebarCollapsed)}
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.06]"
        >
          {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-violet-400')} />
              {!sidebarCollapsed && <span>{item.title}</span>}
              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e1e2a] border-white/10 text-white">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Footer */}
      <div className="p-2">
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="w-full h-10 text-white/40 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e2a] border-white/10 text-white">
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-white/40 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="text-sm">Sign out</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
