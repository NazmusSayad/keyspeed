import { Button } from '@/components/ui/button'
import { useConfigStore } from '@/store/config-store'
import {
  AiBrainIcon,
  PlusSignIcon,
  Settings02Icon,
  TestTubeIcon,
  TransactionHistoryIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { nanoid } from 'nanoid'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { AddProfileDialog } from './add-profile-dialog'
import {
  BetterScrollAreaContent,
  BetterScrollAreaProvider,
} from './ui/better-scroll-area'

const settingsItems = [
  {
    title: 'Test',
    icon: TestTubeIcon,
    href: '/tests',
  },
  {
    title: 'Models',
    icon: AiBrainIcon,
    href: '/models',
  },
  {
    title: 'History',
    icon: TransactionHistoryIcon,
    href: '/history',
  },
  {
    title: 'Settings',
    icon: Settings02Icon,
    href: '/settings',
  },
]

export function AppSidebar() {
  const { profileId } = useParams()

  const pathname = useLocation()
  const navigate = useNavigate()

  const { profiles, addProfile } = useConfigStore()

  function handleAddProfile(name: string) {
    addProfile({
      id: nanoid(),
      name: name.trim(),
      mode: 'local',
      language: 'en',
      hotkey: 'Ctrl+Shift+Space',
    })
  }

  return (
    <div className="flex h-full w-48 flex-col items-start gap-8 overflow-hidden border-r">
      <BetterScrollAreaProvider>
        <BetterScrollAreaContent>
          <div className="flex flex-col items-start gap-2 px-2 pt-2">
            {profiles.map((profile) => (
              <Button
                key={profile.id}
                onClick={() => navigate(`/profile/${profile.id}`)}
                variant={profileId === profile.id ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <span className="text-sm">{profile.name[0]}</span>
                <span className="line-clamp-1 text-sm wrap-anywhere whitespace-break-spaces">
                  {profile.name}
                </span>
              </Button>
            ))}
          </div>

          <div className="sticky bottom-0 mt-2 flex w-full justify-start px-2">
            <AddProfileDialog
              onSubmit={handleAddProfile}
              trigger={
                <Button
                  variant="ghost"
                  className="w-full shrink-0 justify-start"
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" /> Add
                  Profile
                </Button>
              }
            />
          </div>
        </BetterScrollAreaContent>
      </BetterScrollAreaProvider>

      <div className="flex w-full flex-col gap-2 p-2">
        {settingsItems.map((item) => (
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
