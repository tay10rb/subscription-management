import * as React from "react"

import { cn } from "@/lib/utils"

interface CodeProps extends React.HTMLAttributes<HTMLPreElement> {}

const Code = React.forwardRef<HTMLPreElement, CodeProps>(
  ({ className, ...props }, ref) => {
    return (
      <pre
        ref={ref}
        className={cn(
          "rounded-md border bg-muted px-4 py-3 font-mono text-sm overflow-auto max-h-96",
          className
        )}
        {...props}
      />
    )
  }
)
Code.displayName = "Code"

export { Code }