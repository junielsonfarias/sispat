import { Container } from '@/components/ui/responsive-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TestDashboard = () => {
  return (
    <Container size="full" padding="md">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Teste</h1>
          <p className="text-muted-foreground">
            Esta é uma página de teste para verificar se o layout está funcionando.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Teste 1</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Este é um card de teste para verificar se o layout está funcionando corretamente.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Teste 2</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Segundo card de teste para verificar o grid responsivo.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Teste 3</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Terceiro card de teste para verificar se tudo está funcionando.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  )
}

export default TestDashboard
