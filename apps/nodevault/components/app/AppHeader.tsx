'use client'

import Link from 'next/link'
import { Button, Drawer, useOverlayState } from '@heroui/react'
import { Mail, Menu } from 'lucide-react'
import { Container } from '../ui/Container'
import { LinkButton } from '../ui/LinkButton'
import { AccountMenu } from './AccountMenu'
import { AppLogo } from './AppLogo'

export const AppHeader = () => {
  const menu = useOverlayState({ defaultOpen: false })

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
      <Container className="flex items-center justify-between gap-4 h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
        >
          <AppLogo className="size-8" />

          <span className="font-semibold text-sm tracking-tight text-white">
            Node
            <span className="text-sky-400">Vault</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton
            href="/contact"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Mail className="size-4" />
            Get in touch
          </LinkButton>

          <AccountMenu />

          <Drawer state={menu}>
            <Button
              variant="ghost"
              isIconOnly
              aria-label="Toggle menu"
              className="sm:hidden"
            >
              <Menu className="size-5" />
            </Button>

            <Drawer.Backdrop>
              <Drawer.Content placement="right">
                <Drawer.Dialog aria-label="Menu">
                  <Drawer.CloseTrigger />

                  <Drawer.Header>
                    <Drawer.Heading>
                      <span className="flex items-center gap-2.5">
                        <AppLogo className="size-8" />

                        <span className="font-semibold text-sm tracking-tight">
                          Node
                          <span className="text-sky-400">Vault</span>
                        </span>
                      </span>
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body />

                  <Drawer.Footer>
                    <LinkButton
                      href="/contact"
                      variant="outline"
                      fullWidth
                      onClick={menu.close}
                    >
                      <Mail className="size-4" />
                      Get in touch
                    </LinkButton>
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
        </div>
      </Container>
    </header>
  )
}
