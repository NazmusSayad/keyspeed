import { Badge } from '@/components/ui/badge'
import {
  BetterDialog,
  BetterDialogContent,
} from '@/components/ui/better-dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLargeLanguageModels } from '@/features/models/contexts/large-language-models-context'
import { TOnlineLlmSchema } from '@/store/config-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface LlmSelecectionProps {
  value: string
  setValue: (value: string, source?: 'local' | 'online') => void
  onlineLlms?: TOnlineLlmSchema[]
}

export function LlmSelecection({
  value,
  setValue,
  onlineLlms = [],
}: LlmSelecectionProps) {
  const { largeLanguageModels } = useLargeLanguageModels()
  const localModels = (largeLanguageModels || [])
    .filter(({ isDownloaded }) => isDownloaded)
    .map(({ model }) => model)

  const hasModels = localModels.length > 0 || onlineLlms.length > 0

  if (!hasModels) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-sm">
        No LLMs available. Download local models or add remote LLMs.
      </div>
    )
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      variant="outline"
      size="sm"
      spacing={1}
      className="w-full flex-wrap"
    >
      {localModels.map((model) => (
        <ToggleGroupItem
          key={model.id}
          value={model.id}
          onClick={() => setValue(model.id, 'local')}
          className="flex items-center gap-2"
        >
          <span>{model.name}</span>
          <Badge variant="outline" className="text-[10px]">
            Local
          </Badge>
        </ToggleGroupItem>
      ))}

      {onlineLlms.map((model) => (
        <ToggleGroupItem
          key={model.id}
          value={model.id}
          onClick={() => setValue(model.id, 'online')}
          className="flex items-center gap-2"
        >
          <span>{model.name || model.model}</span>
          <Badge variant="secondary" className="text-[10px]">
            Remote
          </Badge>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export type FormattingPreset =
  | { type: 'custom'; prompt: string }
  | { type: 'normal' }
  | { type: 'prompt' }
  | { type: 'email' }
  | { type: 'formal' }

interface FormattingDialogProps {
  preset: FormattingPreset | null
  onSave: (preset: FormattingPreset) => void
}

const formattingDialogSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('normal'),
  }),
  z.object({
    type: z.literal('prompt'),
  }),
  z.object({
    type: z.literal('email'),
  }),
  z.object({
    type: z.literal('formal'),
  }),
  z.object({
    type: z.literal('custom'),
    prompt: z.string().trim().min(1, 'Formatting prompt is required'),
  }),
])

type FormattingDialogValues = z.input<typeof formattingDialogSchema>

function getFormattingDialogValues(
  preset: FormattingPreset | null
): FormattingDialogValues {
  if (preset && preset.type !== 'custom') {
    return {
      type: preset.type,
    }
  }

  return {
    type: 'custom',
    prompt: preset?.type === 'custom' ? preset.prompt : '',
  }
}

function FormattingDialogContent({
  open,
  preset,
  onSave,
  onOpenChange,
}: FormattingDialogProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<FormattingDialogValues>({
    resolver: zodResolver(formattingDialogSchema),
    defaultValues: getFormattingDialogValues(preset),
  })

  const type = form.watch('type')

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset(getFormattingDialogValues(preset))
  }, [form, open, preset])

  function handleSubmit(values: FormattingDialogValues) {
    onSave(values)
    onOpenChange(false)
  }

  return (
    <BetterDialogContent
      title="Output Formatting"
      description="Configure how the AI should format its responses."
      footerCancel
      footerSubmit="Save"
      onFooterSubmitClick={form.handleSubmit(handleSubmit)}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="prompt">Prompt</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="custom">Custom prompt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {type === 'custom' && (
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formatting Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter instructions for how the AI should format responses..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    </BetterDialogContent>
  )
}

export function FormattingDialog({ preset, onSave }: FormattingDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <BetterDialog
      open={open}
      onOpenChange={setOpen}
      width="500px"
      trigger={
        <Button variant="outline" size="sm">
          {preset ? 'Edit Formatting' : 'Configure Formatting'}
        </Button>
      }
    >
      <FormattingDialogContent
        open={open}
        preset={preset}
        onSave={onSave}
        onOpenChange={setOpen}
      />
    </BetterDialog>
  )
}
