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

const remoteLlmFormSchema = z.object({
  name: z.string({ error: 'Display Name is required' }),
  baseUrl: z.url({ error: 'Invalid URL format' }),
  apiKey: z.string({ error: 'API Key is required' }),
  model: z.string({ error: 'Model ID is required' }),
})

type RemoteLlmDialogProps = {
  mode: 'add' | 'edit'
  initial?: z.infer<typeof remoteLlmFormSchema>
  onSubmit: (values: z.infer<typeof remoteLlmFormSchema>) => void
}

function RemoteLlmDialogContent({
  mode,
  initial,
  onSubmit,
}: RemoteLlmDialogProps) {
  const form = useForm({
    resolver: zodResolver(remoteLlmFormSchema),
    defaultValues: initial,
  })

  return (
    <BetterDialogContent
      title={mode === 'edit' ? 'Edit Remote LLM' : 'Add Remote LLM'}
      description="Save provider details in your config"
      footerCancel
      footerSubmit={mode === 'edit' ? 'Save Changes' : 'Add Remote LLM'}
      onFooterSubmitClick={form.handleSubmit(onSubmit)}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="OpenAI Production" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="https://api.openai.com/v1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model ID</FormLabel>
                <FormControl>
                  <Input placeholder="gpt-4o-mini" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="sk-..." {...field} />
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

export function RemoteLlmDialog(
  props: RemoteLlmDialogProps & {
    open: boolean
    onOpenChange: (open: boolean) => void
  }
) {
  return (
    <BetterDialog {...props} width="30rem">
      <RemoteLlmDialogContent {...props} />
    </BetterDialog>
  )
}
