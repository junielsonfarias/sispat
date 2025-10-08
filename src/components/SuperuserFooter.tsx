import { useCustomization } from '@/contexts/CustomizationContext'

export const SuperuserFooter = () => {
  const { settings } = useCustomization()
  // Usar settings diretamente do contexto

  return (
    <footer className="text-center text-sm text-muted-foreground p-4 border-t no-print">
      {settings.superUserFooterText}
    </footer>
  )
}
