import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={`border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary ${className || ""}`}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
