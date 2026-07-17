import type { ReactNode } from 'react'

export const Container = ({ className = '', children }: { className?: string, children: ReactNode }) => (
  <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
)
