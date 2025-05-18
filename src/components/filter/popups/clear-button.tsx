import { BrushCleaning } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'

type ClearButtonProps = ComponentProps<typeof Button>

export function ClearButton({ ...props }: ClearButtonProps) {
  return (
    <Button
      className="border-muted-foreground w-full gap-2 bg-transparent text-xs"
      variant="outline"
      {...props}
    >
      <BrushCleaning className="size-4" />
    </Button>
  )
}
