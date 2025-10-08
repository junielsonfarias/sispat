import { useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, X } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface WidgetWrapperProps {
  id: string
  title: string
  index: number
  children: React.ReactNode
}

export const WidgetWrapper = ({
  id,
  title,
  index,
  children,
}: WidgetWrapperProps) => {
  const { removeWidget, moveWidget } = useDashboard()
  const ref = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const dragIndex = Number(e.dataTransfer.getData('text/plain'))
    moveWidget(dragIndex, index)
  }

  return (
    <div
      ref={ref}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeWidget(id)}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">{children}</CardContent>
      </Card>
    </div>
  )
}
