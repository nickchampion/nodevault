'use client'

import { Button, useTheme } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'

/**
 * Toggles between the light and dark theme, persisted via HeroUI's useTheme (localStorage).
 * `resolvedTheme` is undefined during SSR, so both icons render always and CSS (driven by the
 * .dark class the no-flash script applies pre-hydration) picks the visible one — branching in
 * JS on `resolvedTheme` would render a different icon/label server- vs client-side and fail
 * hydration whenever the stored theme is dark.
 */
export const ThemeSwitch = () => {
  const { resolvedTheme, setTheme } = useTheme()

  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <Button
      variant="ghost"
      isIconOnly
      aria-label="Toggle theme"
      onPress={toggle}
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  )
}
