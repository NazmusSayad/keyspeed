import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TOnlineLlmSchema, useConfigStore } from '@/store/config-store'
import {
  Delete02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { toast } from 'sonner'
import { RemoteLlmDialog } from './remote-llm-dialog'

export function RemoteLlmsSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const rawOnlineLLMs = useConfigStore((state) => state.onlineLlms)
  const addOnlineLlm = useConfigStore((state) => state.addOnlineLlm)

  const onlineLlms = rawOnlineLLMs.filter((llm) => {
    const query = searchQuery.toLowerCase().trim()
    if (query === '') return true

    return (
      llm.name.toLowerCase().includes(query) ||
      llm.model.toLowerCase().includes(query) ||
      llm.baseUrl.toLowerCase().includes(query)
    )
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search models..."
          value={searchQuery}
          className="h-10"
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Button onClick={() => setIsDialogOpen(true)} className="h-10">
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          Add Remote LLM
        </Button>
      </div>

      {onlineLlms.length === 0 ? (
        <div className="bg-muted/20 rounded-xl px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No remote LLMs configured yet. Add an endpoint, API key, and model
            name to make one available in profiles.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {onlineLlms.map((model) => (
            <ModelItem key={model.id} model={model} />
          ))}
        </div>
      )}

      <RemoteLlmDialog
        mode="add"
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={async (values) => {
          addOnlineLlm({ id: nanoid(), ...values })
          setIsDialogOpen(false)
          toast.success('Remote LLM added successfully')
        }}
      />
    </section>
  )
}

function ModelItem({ model }: { model: TOnlineLlmSchema }) {
  const [isEditing, setIsEditing] = useState(false)
  const updateOnlineLlm = useConfigStore((state) => state.updateOnlineLlm)
  const removeOnlineLlm = useConfigStore((state) => state.removeOnlineLlm)

  return (
    <div
      key={model.id}
      className="bg-muted/30 hover:bg-muted/50 flex flex-col gap-4 rounded-xl p-4 transition-colors"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium">{model.name || model.model}</p>
        <p className="text-muted-foreground truncate text-sm">{model.model}</p>
        <p className="text-muted-foreground truncate text-sm">
          {model.baseUrl}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeOnlineLlm(model.id)}
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          Delete
        </Button>
      </div>

      <RemoteLlmDialog
        mode="edit"
        open={isEditing}
        onOpenChange={setIsEditing}
        initial={model}
        onSubmit={async (values) => {
          updateOnlineLlm(model.id, values)
          setIsEditing(false)
          toast.success('Remote LLM updated successfully')
        }}
      />
    </div>
  )
}
