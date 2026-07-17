import { Container } from '../ui/Container'
import { AppLogo } from './AppLogo'

export const AppFooter = () => (
  <footer className="z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
    <Container className="flex items-center justify-between h-16">
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        ©
        {' '}
        {new Date().getFullYear()}
        {' '}
        NodeVault
      </p>

      <div className="flex items-center gap-3">
        <AppLogo className="size-8" />
      </div>
    </Container>
  </footer>
)
