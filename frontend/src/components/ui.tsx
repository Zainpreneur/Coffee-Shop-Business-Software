import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-espresso-800 dark:text-cream-100">{title}</h1>
        {subtitle && <p className="text-sm text-espresso-500 dark:text-espresso-200 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-espresso-800/40 border border-espresso-100 dark:border-espresso-700 rounded-xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-espresso-600 text-white hover:bg-espresso-700",
    secondary: "bg-espresso-100 text-espresso-800 hover:bg-espresso-200 dark:bg-espresso-700 dark:text-cream-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-espresso-600 hover:bg-espresso-100 dark:text-cream-200 dark:hover:bg-espresso-700",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-espresso-400 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-900/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-espresso-400 ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wide text-espresso-500 dark:text-espresso-200 mb-1">{children}</label>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-espresso-100 text-espresso-700 dark:bg-espresso-700 dark:text-cream-100",
    success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-12 text-espresso-400 dark:text-espresso-300 text-sm">{message}</div>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-espresso-200 border-t-espresso-600 rounded-full animate-spin" />
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-espresso-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-espresso-100 dark:border-espresso-700">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-espresso-400 hover:text-espresso-700 dark:hover:text-cream-100 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
