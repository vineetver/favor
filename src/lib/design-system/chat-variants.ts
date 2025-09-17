import { cva } from "class-variance-authority";

export const messageVariants = cva(
  "flex flex-col gap-2 max-w-[85%] transition-all duration-200",
  {
    variants: {
      role: {
        user: "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 ml-auto w-fit rounded-2xl rounded-br-md px-4 py-3 shadow-md",
        assistant:
          "bg-muted/50 border-0 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm",
        system:
          "bg-muted/50 border border-muted-foreground/20 text-muted-foreground rounded-xl px-3 py-2",
      },
      variant: {
        default: "",
        genomics:
          "bg-gradient-to-br from-primary/5 to-primary/8 border-l-4 border-primary/40 rounded-l-xl",
        error:
          "bg-destructive/5 border-l-4 border-destructive/60 text-destructive-foreground rounded-l-xl",
        loading: "animate-pulse",
      },
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-base",
        lg: "px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      role: "assistant",
      variant: "default",
      size: "md",
    },
  },
);

export const avatarVariants = cva(
  "flex items-center justify-center shrink-0 ring-1 shadow-sm transition-all duration-200",
  {
    variants: {
      size: {
        sm: "size-6 rounded-lg",
        md: "size-8 rounded-xl",
        lg: "size-10 rounded-xl",
      },
      variant: {
        assistant:
          "bg-gradient-to-br from-primary/15 to-primary/8 ring-primary/20",
        loading: "bg-muted/80 ring-muted-foreground/20 animate-pulse",
        error: "bg-destructive/10 ring-destructive/30",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "assistant",
    },
  },
);

export const containerVariants = cva(
  "w-full mx-auto px-4 transition-all duration-300",
  {
    variants: {
      size: {
        sm: "max-w-2xl",
        md: "max-w-3xl",
        lg: "max-w-4xl",
        full: "max-w-none",
      },
      spacing: {
        tight: "gap-3",
        normal: "gap-4",
        loose: "gap-6",
      },
    },
    defaultVariants: {
      size: "md",
      spacing: "normal",
    },
  },
);

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        ghost: "hover:bg-muted/50 hover:text-foreground",
        outline: "border border-border bg-background hover:bg-muted/50",
        fab: "bg-gradient-to-r from-primary to-pink-500 text-white hover:shadow-lg transform hover:scale-105",
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-lg",
        md: "h-10 px-4 text-base rounded-xl",
        lg: "h-12 px-6 text-lg rounded-xl",
        icon: "h-8 w-8 rounded-lg",
        fab: "h-12 px-6 text-base rounded-full shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export const inputVariants = cva(
  "flex min-h-[60px] w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-base transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "bg-muted/50",
        elevated: "bg-card/80 border-border/60 backdrop-blur-sm shadow-sm",
      },
      size: {
        sm: "min-h-[48px] px-3 py-2 text-sm",
        md: "min-h-[60px] px-4 py-3 text-base",
        lg: "min-h-[72px] px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border/60 bg-card/80 backdrop-blur-sm shadow-md",
        interactive:
          "border-border hover:border-border/80 hover:shadow-md cursor-pointer",
        genomics:
          "border-primary/25 bg-gradient-to-br from-primary/5 to-primary/10",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  },
);
