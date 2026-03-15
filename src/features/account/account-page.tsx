import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProfileDialog } from '@/features/account/profile-dialog'
import { TProfileSchema, useConfigStore } from '@/store/config-store'
import { Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useState } from 'react'

export function AccountPage() {
  const { profiles, removeProfile, updateProfile, addProfile } =
    useConfigStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalProfile, setModalProfile] = useState<TProfileSchema | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  function handleAddProfile() {
    setModalProfile({
      id: nanoid(),
      name: '',
      mode: 'local',
      language: 'en',
      hotkey: 'Ctrl+Shift+Space',
    })
    setIsEditMode(false)
    setModalOpen(true)
  }

  function handleEditProfile(profile: TProfileSchema) {
    setModalProfile({ ...profile })
    setIsEditMode(true)
    setModalOpen(true)
  }

  function handleDeleteProfile(id: string) {
    removeProfile(id)
  }

  function handleSaveProfile(profile: TProfileSchema) {
    if (isEditMode) {
      updateProfile(profile.id, profile)
    } else {
      addProfile(profile)
    }

    setModalOpen(false)
    setModalProfile(null)
  }

  async function handleClearAllData() {
    // !TODO: Implement clear all data
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Profile</CardTitle>
          <CardDescription>Manage your account and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">U</AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Local User</p>
              <p className="text-muted-foreground text-sm">
                Desktop Application
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input id="username" placeholder="Enter your name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-0">
          <CardTitle className="text-lg">Your Profiles</CardTitle>
          <CardDescription>
            Manage your created profiles and their modes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No profiles created yet
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {profile.mode}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {profile.hotkey || 'No hotkey'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProfile(profile)}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;
                            {profile.name}
                            &rdquo;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            className="ml-auto w-max"
            variant="default"
            size="sm"
            onClick={handleAddProfile}
          >
            <Plus className="size-4" />
            Add Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data & Privacy</CardTitle>
          <CardDescription>
            Manage your local data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Local Data Storage</p>
            <p className="text-muted-foreground text-sm">
              All your transcriptions and settings are stored locally on your
              device. No data is sent to external servers except when using
              online LLM optimization.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Clear All Data</p>
            <p className="text-muted-foreground text-sm">
              Remove all local data including profiles, settings, and
              transcriptions from your device. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to clear all data? This will remove
                    all your profiles, settings, and local transcriptions. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {modalProfile && (
        <ProfileDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          profile={modalProfile}
          isEditMode={isEditMode}
          onSubmit={handleSaveProfile}
        />
      )}
    </div>
  )
}
