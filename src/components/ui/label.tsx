import * as React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = ({ className, ...props }: LabelProps) => (
  <label className={`block text-sm font-medium mb-1 ${className || ""}`} {...props} />
);
