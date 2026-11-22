"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/types";

const navItems: { to: string; label: string; icon: string; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", icon: "📊", roles: ["admin", "manager", "cashier"] },
  { to: "/pos", label: "Point of Sale", icon: "🛒", roles: ["admin", "manager", "cashier"] },
  { to: "/orders", label: "Orders", icon: "🧾", roles: ["admin", "manager", "cashier"] },
  { to: "/menu", label: "Menu", icon: "☕", roles: ["admin", "manager"] },
  { to: "/inventory", label: "Inventory", icon: "📦", roles: ["admin", "manager"] },
  { to: "/customers", label: "Customers", icon: "🧑‍🤝‍🧑", roles: ["admin", "manager", "cashier"] },
  { to: "/staff", label: "Staff", icon: "🧑‍🍳", roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-cream-100 dark:bg-[#1a1310] text-espresso-900 dark:text-cream-200">
      <aside className="w-60 shrink-0 bg-espresso-800 text-cream-100 flex flex-col">
        <div className="px-5 py-6 border-b border-espresso-700">
          <h1 className="text-xl font-bold flex items-center gap-2">☕ Brew&nbsp;Base</h1>
          <p className="text-xs text-espresso-200 mt-1">Coffee Shop Business Suite</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !user || item.roles.includes(user.role))
            .map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-espresso-600 text-white" : "text-espresso-100 hover:bg-espresso-700"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="px-5 py-4 border-t border-espresso-700">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-espresso-200 capitalize">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 w-full text-xs bg-espresso-700 hover:bg-espresso-600 rounded-md py-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
