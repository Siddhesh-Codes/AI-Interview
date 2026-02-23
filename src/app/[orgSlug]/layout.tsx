import { AdminShell } from '@/components/admin/admin-shell';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return <AdminShell orgSlug={orgSlug}>{children}</AdminShell>;
}
