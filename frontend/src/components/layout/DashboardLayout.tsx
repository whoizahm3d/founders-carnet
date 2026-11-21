'use client';

import { useAuth } from '@/context/AuthContext';
import { TopNav } from '@/components/layout/TopNav';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 1. If unauthenticated, redirect to /login
  // 2. Role-based route guard: prevent user from visiting another role's routes
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if current route belongs to another role
      const roles = ['founder', 'talent', 'mentor', 'investor', 'admin'] as const;
      const targetRole = roles.find((r) => pathname.startsWith(`/${r}`));
      if (targetRole && targetRole !== user.role) {
        router.replace(`/${user.role}/dashboard`);
      }
    }
  }, [user, isLoading, pathname, router]);

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card px-8 py-6 flex items-center gap-4">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-secondary">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating Glass Top Navigation */}
      <TopNav user={user} onLogout={logout} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer: compact PublicFooter variant */}
      <PublicFooter variant="compact" />
    </div>
  );
}
