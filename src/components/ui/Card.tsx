import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  goldBorder?: boolean;
  className?: string;
}

export default function Card({ children, goldBorder = false, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        goldBorder ? 'border-t-4 border-t-augusta-gold' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
