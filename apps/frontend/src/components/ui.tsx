import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import { BoxIcon } from "./icons";

export function Card({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`rounded-2xl border border-workshop-border bg-workshop-panel p-4 shadow-panel ${className}`} {...props}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const iconTone =
    tone === "warn"
      ? "bg-amber-500/15 text-amber-400"
      : tone === "ok"
        ? "bg-emerald-500/15 text-emerald-400"
        : "bg-workshop-accent/15 text-workshop-accent";
  return (
    <Card className="flex items-center gap-3">
      {icon && <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconTone}`}>{icon}</span>}
      <div className="flex flex-col">
        <span className="text-2xl font-bold leading-tight text-slate-50">{value}</span>
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
  variant = "default",
}: PropsWithChildren<{ tone?: "neutral" | "warn" | "ok"; variant?: "default" | "secondary" }>) {
  let className = "";
  if (variant === "secondary") {
    className = "bg-slate-700/40 text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full";
  } else {
    className =
      tone === "warn"
        ? "bg-amber-500/15 text-amber-400"
        : tone === "ok"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-slate-700/40 text-slate-300";
    className += " rounded-full px-2 py-0.5 text-xs font-medium";
  }
  return <span className={className}>{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-workshop-accent" />
      Loading…
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-red-400">{message}</p>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-workshop-accent text-white hover:bg-workshop-accentmuted shadow-sm shadow-workshop-accent/20",
  secondary:
    "border border-workshop-border text-slate-200 hover:bg-slate-800/60 bg-transparent",
  outlineAccent: "border border-workshop-accent text-workshop-accent hover:bg-workshop-accent/10 bg-transparent",
  ghost: "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 bg-transparent",
};

const buttonSizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof buttonVariants;
    size?: keyof typeof buttonSizes;
  }
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
});

const fieldClass =
  "w-full rounded-lg border border-workshop-border bg-workshop-panelmuted px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-workshop-accent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref
) {
  return <input ref={ref} className={`${fieldClass} ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", ...props },
  ref
) {
  return <select ref={ref} className={`${fieldClass} ${className}`} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`${fieldClass} ${className}`} {...props} />;
  }
);

export function FieldLabel({ children }: PropsWithChildren) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-300">{children}</label>;
}

export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-800 ${className}`}>
      <div
        className="h-full rounded-full bg-workshop-accent transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

const thumbnailSizes = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function ModelThumbnail({
  imageUrl,
  size = "md",
  className = "",
}: {
  imageUrl?: string | null;
  size?: keyof typeof thumbnailSizes;
  className?: string;
}) {
  const sizeClass = thumbnailSizes[size];
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${sizeClass} flex-shrink-0 rounded-xl border border-workshop-border object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex ${sizeClass} flex-shrink-0 items-center justify-center rounded-xl bg-workshop-accent/15 text-workshop-accent ${className}`}
    >
      <BoxIcon className="h-5 w-5" />
    </span>
  );
}

export function MediaCard({
  image,
  imageAlt = "",
  aspect = "aspect-[4/3]",
  overlay,
  children,
  className = "",
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { image?: string | null; imageAlt?: string; aspect?: string; overlay?: ReactNode }
>) {
  return (
    <div
      className={`group overflow-hidden rounded-2xl border border-workshop-border bg-workshop-panel shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-workshop-accent/50 hover:shadow-lift ${className}`}
      {...props}
    >
      <div className={`relative ${aspect} w-full overflow-hidden bg-workshop-panelmuted`}>
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-workshop-accent/30">
            <BoxIcon className="h-10 w-10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-workshop-panel via-workshop-panel/10 to-transparent opacity-90" />
        {overlay && <div className="absolute inset-x-0 bottom-0 p-3">{overlay}</div>}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export function SectionCard({ title, children, actions }: PropsWithChildren<{ title: string; actions?: ReactNode }>) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">{title}</h2>
        {actions}
      </div>
      {children}
    </Card>
  );
}
