import { LogIn, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';

interface TopBarProps {
  shopName: string;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  shopName,
  user,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#overview"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 truncate max-w-[260px] sm:max-w-none"
        >
          {shopName}
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        {user ? (
          <nav
            aria-label="เมนูหลัก"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#overview"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              กำไรขาดทุน
            </a>
            <a
              href="#entry"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              คีย์ยอดขาย / ซื้อของ
            </a>
            <a
              href="#ledger"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              ตารางรายการ
            </a>
            <button
              type="button"
              onClick={onOpenSettings}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ตั้งค่ายอดยกมา
            </button>
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
