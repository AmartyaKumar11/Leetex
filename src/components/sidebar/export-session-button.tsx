import { Download } from "lucide-react"

import { Button } from "~/components/ui/button"

interface ExportSessionButtonProps {
  disabled: boolean
  onExport: () => void | Promise<void>
}

export function ExportSessionButton({ disabled, onExport }: ExportSessionButtonProps) {
  return (
    <Button
      type="button"
      className="w-full font-medium"
      disabled={disabled}
      onClick={onExport}>
      <Download className="h-4 w-4" aria-hidden="true" />
      Export Session
    </Button>
  )
}
