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
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const configureProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required'),
})

type ConfigureProfileDialogProps = {
  initial: z.infer<typeof configureProfileSchema>
  onSubmit: (values: z.infer<typeof configureProfileSchema>) => void
}

function ConfigureProfileDialogContent({
  initial,
  onSubmit,
}: ConfigureProfileDialogProps) {
  const form = useForm({
    resolver: zodResolver(configureProfileSchema),
    values: initial,
  })

  return (
    <BetterDialogContent
      title="Rename Profile"
      description="Give this profile a clearer name for quick switching"
      footerCancel
      footerSubmit="Save"
      onFooterSubmitClick={form.handleSubmit(onSubmit)}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile name</FormLabel>
                <FormControl>
                  <Input placeholder="Writing profile" {...field} />
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

export function ConfigureProfileDialog(
  props: ConfigureProfileDialogProps & {
    open: boolean
    onOpenChange: (open: boolean) => void
  }
) {
  return (
    <BetterDialog {...props} width="30rem">
      <ConfigureProfileDialogContent {...props} />
    </BetterDialog>
  )
}
