"use client";

import {
  Bell,
  CalendarCheck,
  CircleHelp,
  LayoutGrid,
  LogOut,
  Menu,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { userRoutes } from "@/constants/routes";
import { signOut } from "@/features/user/auth/session";
import { cx } from "@/lib/cx";

interface AccountNavItem {
  label: string;
  icon: LucideIcon;
  /** Items without a page yet render as plain text (same styling), like the footer. */
  href?: Route;
}

const accountItems: readonly AccountNavItem[] = [
  { label: "Overview", icon: LayoutGrid },
  { label: "My bookings", icon: CalendarCheck },
  { label: "My enquiries", icon: MessagesSquare },
  { label: "Profile details", icon: UserRound, href: userRoutes.accountProfile },
  { label: "Security", icon: ShieldCheck },
  { label: "Notifications", icon: Bell },
  { label: "Help & support", icon: CircleHelp },
];

export interface AccountNavProps {
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  className?: string;
}

const itemClass =
  "flex h-11 items-center gap-3 px-3 text-[13px] text-midnight outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand-950";

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const router = useRouter();
  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {accountItems.map(({ label, icon: Icon, href }) => {
          const content = (
            <>
              <Icon aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
              {label}
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={pathname === href ? "page" : undefined}
                  className={cx(itemClass, "hover:bg-pearl/60 aria-[current=page]:bg-pearl")}
                >
                  {content}
                </Link>
              ) : (
                <span className={itemClass}>{content}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-field-line mt-3 border-t pt-3">
        <button
          type="button"
          onClick={() => {
            onNavigate();
            // Local session is cleared either way; go to sign in once the server call settles.
            void signOut().finally(() => router.push(userRoutes.login));
          }}
          className={cx(itemClass, "hover:bg-pearl/60 w-full")}
        >
          <LogOut aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}

function ProfileSummary({ fullName, email, isEmailVerified }: Omit<AccountNavProps, "className">) {
  return (
    <div className="border-field-line border-b px-3 pb-5">
      <UserRound aria-hidden="true" strokeWidth={1.25} className="text-midnight size-7" />
      <p className="text-midnight mt-3 text-xl leading-tight">{fullName}</p>
      <p className="text-slate-ink mt-1 truncate text-[11px]">{email}</p>
      {isEmailVerified && (
        <p className="bg-forest mt-3 px-2.5 py-1.5 text-[10px] tracking-wide text-white">
          Email verified
        </p>
      )}
    </div>
  );
}

/**
 * Account area navigation: a bordered sidebar card on large screens, and a
 * beige "My account" bar that expands into the same menu on smaller ones.
 */
export function AccountNav({ className, ...profile }: AccountNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className={className}>
      {/* Small screens */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
          className="bg-pearl text-midnight focus-visible:outline-brand-950 flex h-12 w-full items-center justify-between px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex items-center gap-3">
            <UserRound aria-hidden="true" strokeWidth={1.5} className="size-4" />
            My account
          </span>
          {isOpen ? (
            <X aria-hidden="true" strokeWidth={1.5} className="size-5" />
          ) : (
            <Menu aria-hidden="true" strokeWidth={1.5} className="size-5" />
          )}
        </button>
        <nav
          id={panelId}
          aria-label="Account"
          hidden={!isOpen}
          className="border-field-line border border-t-0 bg-white px-3 py-5"
        >
          <ProfileSummary {...profile} />
          <div className="mt-4">
            <NavList pathname={pathname} onNavigate={close} />
          </div>
        </nav>
      </div>

      {/* Large screens */}
      <nav
        aria-label="Account"
        className="border-field-line hidden border bg-white px-3 pt-5 pb-6 lg:block"
      >
        <ProfileSummary {...profile} />
        <div className="mt-4">
          <NavList pathname={pathname} onNavigate={close} />
        </div>
      </nav>
    </div>
  );
}
