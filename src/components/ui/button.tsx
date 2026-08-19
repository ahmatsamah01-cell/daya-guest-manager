import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-xl text-sm font-medium",
    "cursor-pointer select-none overflow-hidden",
    "transform-gpu transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "motion-reduce:transform-none motion-reduce:transition-none",

    "before:pointer-events-none before:absolute before:inset-0",
    "before:-translate-x-full",
    "before:bg-gradient-to-r",
    "before:from-transparent before:via-white/25 before:to-transparent",
    "before:transition-transform before:duration-700",
    "hover:before:translate-x-full",

    "[&>*]:relative [&>*]:z-10",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-md shadow-primary/20",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/35",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        destructive: [
          "bg-destructive text-destructive-foreground shadow-md shadow-destructive/20",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:bg-destructive/90 hover:shadow-xl hover:shadow-destructive/30",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        outline: [
          "border border-input bg-background/70 text-foreground shadow-sm backdrop-blur-sm",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:border-primary/50 hover:bg-primary/10",
          "hover:text-primary hover:shadow-lg hover:shadow-primary/15",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        secondary: [
          "bg-secondary text-secondary-foreground shadow-sm",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:bg-secondary/80 hover:shadow-lg",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        ghost: [
          "bg-transparent hover:-translate-y-0.5",
          "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        link: [
          "h-auto rounded-md p-0 text-primary underline-offset-4",
          "hover:text-primary/80 hover:underline",
          "before:hidden",
        ],

        glow: [
          "bg-gradient-to-r from-primary via-purple-500 to-pink-500",
          "text-white shadow-lg shadow-purple-500/30",
          "hover:-translate-y-1 hover:scale-[1.03]",
          "hover:shadow-2xl hover:shadow-purple-500/50",
          "active:translate-y-0 active:scale-[0.98]",
        ],

        glass: [
          "border border-white/30 bg-white/20 text-foreground",
          "shadow-lg backdrop-blur-xl",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:bg-white/35 hover:shadow-xl",
          "active:translate-y-0 active:scale-[0.98]",
        ],
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-8",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };