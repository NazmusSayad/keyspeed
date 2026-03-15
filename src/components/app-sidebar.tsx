import { Button } from '@/components/ui/button'
import { TestTubeIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation } from 'react-router'

const sidebarItems = [
  {
    title: 'Home',
    icon: TestTubeIcon,
    href: '/',
  },
]

export function AppSidebar() {
  const pathname = useLocation()

  return (
    <div className="flex h-full w-48 flex-col items-start gap-8 overflow-hidden border-r">
      <div className="flex w-full flex-col gap-2 p-2">
        {sidebarItems.map((item) => (
          <Button
            key={item.title}
            asChild
            className="w-full shrink-0 justify-start"
            variant={pathname.pathname === item.href ? 'default' : 'ghost'}
          >
            <Link to={item.href}>
              <HugeiconsIcon icon={item.icon} className="size-4" /> {item.title}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
