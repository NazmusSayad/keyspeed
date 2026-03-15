import {
  AwesomeTabs,
  AwesomeTabsContent,
  AwesomeTabsTriggers,
} from '@/components/ui/awesome-tabs'
import { useConfigStore } from '@/store/config-store'
import {
  SecurityWifiIcon,
  WifiOff02Icon,
  WirelessCloudAccessIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Navigate, useParams } from 'react-router'
import { HotkeyAndLanguageSelection } from './components/hotkey-and-language-selection'
import { ProfileIntro } from './components/profile-intro'
import { HybridModeView } from './hybrid-mode-view'
import { LocalModeView } from './local-mode-view'
import { OnlineModeView } from './online-mode-view'

export function ProfileView() {
  const { profileId } = useParams()
  const profile = useConfigStore((state) =>
    state.profiles.find((profile) => profile.id === profileId)
  )

  const updateProfile = useConfigStore((state) => state.updateProfile)

  if (!profile) {
    return <Navigate to="/profile/none" replace />
  }

  return (
    <div className="space-y-6">
      <ProfileIntro profile={profile} />
      <HotkeyAndLanguageSelection profile={profile} />

      <AwesomeTabs
        defaultTab={
          profile.mode === 'local'
            ? 0
            : profile.mode === 'hybrid'
              ? 1
              : profile.mode === 'online'
                ? 2
                : undefined
        }
        items={[
          {
            className: 'h-10!',
            label: (
              <>
                <HugeiconsIcon icon={WifiOff02Icon} /> Local
              </>
            ),
            content: <LocalModeView profile={profile} />,
            onClick: () => updateProfile(profile.id, { mode: 'local' }),
          },
          {
            id: 'hybrid',
            className: 'h-10!',
            label: (
              <>
                <HugeiconsIcon icon={SecurityWifiIcon} /> Hybrid
              </>
            ),
            content: <HybridModeView profile={profile} />,
            onClick: () => updateProfile(profile.id, { mode: 'hybrid' }),
          },
          {
            id: 'online',
            className: 'h-10!',
            label: (
              <>
                <HugeiconsIcon icon={WirelessCloudAccessIcon} /> Online
              </>
            ),
            content: <OnlineModeView profile={profile} />,
            onClick: () => updateProfile(profile.id, { mode: 'online' }),
          },
        ]}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h4>Speech Recognition</h4>
            <p className="text-muted-foreground text-[0.8125rem]">
              Choose how you want to perform speech recognition. Local mode
            </p>
          </div>

          <AwesomeTabsTriggers className="shrink-0" />
        </div>

        <AwesomeTabsContent />
      </AwesomeTabs>
    </div>
  )
}
