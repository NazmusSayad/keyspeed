import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TProfileSchema, useConfigStore } from '@/store/config-store'
import {
  Delete02Icon,
  Edit02Icon,
  SecurityWifiIcon,
  Settings02Icon,
  WifiOff02Icon,
  WirelessCloudAccessIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ConfigureProfileDialog } from './configure-profile-dialog'

const modeCopy = {
  local: {
    icon: WifiOff02Icon,
    label: 'Local profile',
    description:
      'Runs on-device for private, low-latency dictation that feels immediate.',
  },
  hybrid: {
    icon: SecurityWifiIcon,
    label: 'Hybrid profile',
    description:
      'Balances offline transcription with smarter cloud-powered refinement.',
  },
  online: {
    icon: WirelessCloudAccessIcon,
    label: 'Online profile',
    description:
      'Optimized for connected workflows with remote models and richer responses.',
  },
} satisfies Record<
  TProfileSchema['mode'],
  { icon: typeof WifiOff02Icon; label: string; description: string }
>

export function ProfileIntro({ profile }: { profile: TProfileSchema }) {
  const updateProfile = useConfigStore((state) => state.updateProfile)
  const removeProfile = useConfigStore((state) => state.removeProfile)
  const [isConfigureOpen, setIsConfigureOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const activeMode = modeCopy[profile.mode]

  return (
    <>
      <section className="flex flex-col gap-3 py-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="line-clamp-1 max-w-[35rem] truncate text-2xl leading-none font-semibold tracking-[-0.04em] wrap-anywhere whitespace-break-spaces md:text-4xl">
                {profile.name}
              </h1>

              <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <HugeiconsIcon
                  icon={activeMode.icon}
                  className="text-primary size-4"
                />
                <span>{activeMode.label}</span>
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-6">
              {activeMode.description}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground rounded-full"
              >
                <HugeiconsIcon icon={Settings02Icon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setIsConfigureOpen(true)}>
                <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                Rename Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setIsDeleteOpen(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                Delete Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <ConfigureProfileDialog
        open={isConfigureOpen}
        onOpenChange={setIsConfigureOpen}
        initial={{
          name: profile.name,
        }}
        onSubmit={(values) => {
          updateProfile(profile.id, {
            name: values.name.trim(),
          })
          setIsConfigureOpen(false)
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{profile.name}&rdquo;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeProfile(profile.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
