import { forwardRef } from 'react'
import { Theme } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ThemePreviewProps {
  theme: Theme
}

export const ThemePreview = forwardRef<HTMLDivElement, ThemePreviewProps>(
  ({ theme }, ref) => {
    const themeStyle: React.CSSProperties = {
      '--background': theme.colors.background,
      '--foreground': theme.colors.foreground,
      '--card': theme.colors.card,
      '--card-foreground': theme.colors.cardForeground,
      '--popover': theme.colors.popover,
      '--popover-foreground': theme.colors.popoverForeground,
      '--primary': theme.colors.primary,
      '--primary-foreground': theme.colors.primaryForeground,
      '--secondary': theme.colors.secondary,
      '--secondary-foreground': theme.colors.secondaryForeground,
      '--muted': theme.colors.muted,
      '--muted-foreground': theme.colors.mutedForeground,
      '--accent': theme.colors.accent,
      '--accent-foreground': theme.colors.accentForeground,
      '--destructive': theme.colors.destructive,
      '--destructive-foreground': theme.colors.destructiveForeground,
      '--border': theme.colors.border,
      '--input': theme.colors.input,
      '--ring': theme.colors.ring,
      '--radius': theme.borderRadius,
      fontFamily: theme.fontFamily,
    } as React.CSSProperties

    return (
      <div
        ref={ref}
        className="p-4 rounded-lg border bg-[hsl(var(--background))]"
        style={themeStyle}
      >
        <Card
          className={cn('w-full')}
          style={{
            borderRadius: 'var(--radius)',
          }}
        >
          <CardHeader>
            <CardTitle
              style={{
                color: 'hsl(var(--card-foreground))',
              }}
            >
              {theme.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p style={{ color: 'hsl(var(--foreground))' }}>
              Este é um texto de exemplo.
            </p>
            <div className="flex gap-2">
              <Button
                style={{
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: 'var(--radius)',
                }}
              >
                Primário
              </Button>
              <Button
                style={{
                  backgroundColor: 'hsl(var(--secondary))',
                  color: 'hsl(var(--secondary-foreground))',
                  borderRadius: 'var(--radius)',
                }}
              >
                Secundário
              </Button>
            </div>
            <Progress value={60} />
          </CardContent>
        </Card>
      </div>
    )
  },
)

ThemePreview.displayName = 'ThemePreview'
