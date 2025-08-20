import { cva, type VariantProps } from "class-variance-authority";
import React, { type ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/general";

export type VariantType = "primary";

export const buttonCva = cva(
  [
    "flex flex-row items-center justify-center self-center rounded-medium",
    "focus:outline-none select-none",
    "leading-[20px] tracking-[0.10px] font-normal py-[20px] px-[21px] text-[14px]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-on-primary",
          "hover:bg-primary-30",
          "focus:bg-primary-30",
          "shadow shadow-sm shadow-on-surface/40",
        ],
      },
    },

    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonCva> {
  className?: string;
  variant?: VariantType;
  href?: string;
}

const FABButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { children, href, variant = "primary", disabled, className, ...props },
    ref,
  ) => {
    const Component = href ? Link : ("button" as React.ElementType);
    return (
      <Component
        ref={ref}
        disabled={disabled}
        href={href}
        className={cn(
          buttonCva({
            variant,
          }),
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

FABButton.displayName = "Button";
export default FABButton;
