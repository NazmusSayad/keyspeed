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
import { zodResolver } from '@hookform/resolvers/zod'
import { ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type AddProfileDialogProps = {
  trigger: ReactNode
  onSubmit: (name: string) => void
}

const addProfileDialogSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required'),
})

function AddProfileDialogContent({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}) {
  const form = useForm({
    resolver: zodResolver(addProfileDialogSchema),
    defaultValues: {
      name: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({ name: '' })
    }
  }, [form, open])

  function handleSubmit(values: z.infer<typeof addProfileDialogSchema>) {
    onSubmit(values.name)
    form.reset({ name: '' })
    onOpenChange(false)
  }

  return (
    <BetterDialogContent
      title="Add Profile"
      description="Create a new profile to organize your settings."
      footerCancel
      footerSubmit="Add"
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
                  <Input id="name" placeholder="Profile name" {...field} />
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

export function AddProfileDialog({ trigger, onSubmit }: AddProfileDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <BetterDialog
      open={open}
      onOpenChange={setOpen}
      width="425px"
      trigger={trigger}
    >
      <AddProfileDialogContent
        open={open}
        onOpenChange={setOpen}
        onSubmit={onSubmit}
      />
    </BetterDialog>
  )
}
