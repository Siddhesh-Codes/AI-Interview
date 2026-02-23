'use client';

import { useAdminStore } from '@/stores/admin-store';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { cn } from '@/lib/utils';

export function AdminShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useAdminStore();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <AdminSidebar orgSlug={orgSlug} />
      <main
        className={cn(
          'relative z-10 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-[68px]' : 'ml-[260px]'
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
