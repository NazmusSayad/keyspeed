import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES } from '@/constants/languages'
import { TProfileSchema, useConfigStore } from '@/store/config-store'
import { KeyboardIcon, LanguageCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback } from 'react'
import { HotkeyCaptureButton } from './hotkey-capture-button'

export function HotkeyAndLanguageSelection({
  profile,
}: {
  profile: TProfileSchema
}) {
  const updateProfile = useConfigStore((state) => state.updateProfile)

  const onHotkeyChange = useCallback(
    (hotkey: string) => {
      updateProfile(profile.id, { hotkey })
    },
    [profile.id, updateProfile]
  )

  return (
    <section className="flex w-full flex-col gap-8 pt-2 pb-3 md:flex-row">
      <div className="flex basis-full flex-col items-start justify-center gap-x-8 gap-y-3 xl:flex-row">
        <div className="flex h-10 shrink-0 items-center gap-2">
          <div className="bg-muted/35 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={KeyboardIcon} className="size-6.5" />
          </div>

          <div>
            <h3 className="text-sm font-medium tracking-tight">Shortcut</h3>
            <p className="text-muted-foreground shrink-0 text-xs leading-5">
              Press once and release to save.
            </p>
          </div>
        </div>

        <HotkeyCaptureButton
          value={profile.hotkey || ''}
          onChange={onHotkeyChange}
        />
      </div>

      <div className="flex basis-full flex-col items-start justify-center gap-x-8 gap-y-3 xl:flex-row">
        <div className="flex h-10 shrink-0 items-center gap-2">
          <div className="bg-muted/35 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={LanguageCircleIcon} className="size-6" />
          </div>

          <div>
            <h3 className="text-sm font-medium tracking-tight">Language</h3>
            <p className="text-muted-foreground text-xs leading-5">
              Default transcription language.
            </p>
          </div>
        </div>

        <Select
          value={profile.language}
          onValueChange={(language) => updateProfile(profile.id, { language })}
        >
          <SelectTrigger className="bg-muted/24 hover:bg-muted/34 h-12! w-full rounded-xl border-transparent px-3.5 shadow-none transition-colors hover:border-transparent">
            <div className="flex min-w-0 items-center gap-3">
              <SelectValue placeholder="Select a language" />
            </div>
          </SelectTrigger>
          <SelectContent align="start" className="border-border/70 rounded-xl">
            {LANGUAGES.map((languageOption) => (
              <SelectItem
                key={languageOption.code}
                value={languageOption.code}
                className="rounded-lg py-2"
              >
                {languageOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
