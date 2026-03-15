import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AnalyticsUpIcon, Settings01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation } from 'react-router'

const sidebarItems = [
  {
    title: 'Overview',
    icon: AnalyticsUpIcon,
    href: '/',
  },
  {
    title: 'Settings',
    icon: Settings01Icon,
    href: '/settings',
  },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full flex-col items-start gap-8 overflow-hidden border-r">
      <div className="flex w-full flex-col gap-2 p-2">
        {sidebarItems.map((item) => (
          <Button
            key={item.title}
            asChild
            variant="ghost"
            className={cn(
              'size-9 shrink-0 rounded-xl',
              pathname === item.href &&
                'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary'
            )}
          >
            <Link to={item.href}>
              <HugeiconsIcon icon={item.icon} className="size-5.5" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
