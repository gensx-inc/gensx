import * as React from 'react';

// Export hooks
export * from './src/hooks/use-gensx';

// Example placeholder exports
export const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return <button {...props}>{children}</button>;
}; 