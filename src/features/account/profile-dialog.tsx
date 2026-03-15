import {
  BetterDialog,
  BetterDialogContent,
} from '@/components/ui/better-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TProfileSchema } from '@/store/config-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type ProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: TProfileSchema
  isEditMode: boolean
  onSubmit: (profile: TProfileSchema) => void
}

const profileDialogSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required'),
})

function ProfileDialogContent({
  open,
  onOpenChange,
  profile,
  isEditMode,
  onSubmit,
}: ProfileDialogProps) {
  const form = useForm({
    resolver: zodResolver(profileDialogSchema),
    defaultValues: {
      name: profile.name,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      name: profile.name,
    })
  }, [form, open, profile])

  function handleSubmit(values: z.infer<typeof profileDialogSchema>) {
    onSubmit({
      ...profile,
      name: values.name,
    })
    onOpenChange(false)
  }

  return (
    <BetterDialogContent
      title={isEditMode ? 'Edit Profile' : 'Add Profile'}
      description={
        isEditMode
          ? 'Update profile settings'
          : 'Create a new profile to organize your settings'
      }
      footerCancel
      footerSubmit={isEditMode ? 'Save' : 'Add'}
      onFooterSubmitClick={form.handleSubmit(handleSubmit)}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Name</FormLabel>
                <FormControl>
                  <Input
                    id="profile-name"
                    placeholder="Enter profile name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </BetterDialogContent>
  )
}

export function ProfileDialog(props: ProfileDialogProps) {
  return (
    <BetterDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      width="425px"
    >
      <ProfileDialogContent {...props} />
    </BetterDialog>
  )
}
