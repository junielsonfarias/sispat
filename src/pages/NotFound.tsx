/* Página 404 — exibida quando o usuário acessa uma rota inexistente */
import { useLocation } from 'react-router-dom'

const NotFound = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">
          Ops! Página não encontrada
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          A rota <code className="font-mono">{location.pathname}</code> não existe.
        </p>
        <a href="/" className="text-primary hover:underline">
          Voltar para o início
        </a>
      </div>
    </div>
  )
}

export default NotFound
