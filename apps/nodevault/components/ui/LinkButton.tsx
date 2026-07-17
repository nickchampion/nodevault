import Link from 'next/link'
import { buttonVariants } from '@heroui/styles'
import type { ButtonVariants } from '@heroui/styles'
import type { ReactNode } from 'react'

type LinkButtonProps = {
  href: string
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  fullWidth?: boolean
  className?: string
  onClick?: () => void
  children: ReactNode
}

/** Next.js client-side navigation styled as a HeroUI button. */
export const LinkButton = ({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  children,
}: LinkButtonProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={`${buttonVariants({ variant, size, fullWidth })} ${className}`}
  >
    {children}
  </Link>
)
