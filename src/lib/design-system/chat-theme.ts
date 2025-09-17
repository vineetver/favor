export const chatSpacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.5rem", // 24px
  "2xl": "2rem", // 32px
  "3xl": "3rem", // 48px
} as const;

export const chatRadius = {
  sm: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.5rem", // 24px
  "2xl": "2rem", // 32px
  full: "9999px",
} as const;

export const chatAnimations = {
  transition: {
    fast: { duration: 0.15, ease: "easeOut" },
    normal: { duration: 0.3, ease: "easeOut" },
    slow: { duration: 0.5, ease: "easeOut" },
  },
  spring: {
    gentle: { type: "spring", stiffness: 300, damping: 20 },
    snappy: { type: "spring", stiffness: 400, damping: 17 },
    bouncy: { type: "spring", stiffness: 500, damping: 15 },
  },
} as const;

export const chatColors = {
  message: {
    user: "bg-primary text-primary-foreground",
    assistant: "bg-card/60 border border-border/60",
    genomics:
      "bg-gradient-to-br from-primary/8 to-primary/12 border border-primary/25",
    error:
      "bg-destructive/10 border border-destructive/30 text-destructive-foreground",
  },
  avatar: {
    assistant: "bg-gradient-to-br from-primary/15 to-primary/8 ring-primary/20",
    loading: "bg-muted/80 ring-muted-foreground/20",
  },
  surface: {
    elevated: "bg-card/80 border border-border/50 backdrop-blur-sm shadow-sm",
    interactive: "hover:bg-muted/50 transition-colors duration-200",
    genomics:
      "bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20",
  },
} as const;

export const chatShadows = {
  subtle: "shadow-sm",
  elevated: "shadow-md",
  floating: "shadow-lg",
  dramatic: "shadow-xl",
} as const;
