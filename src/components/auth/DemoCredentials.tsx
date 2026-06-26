import { Crown, Shield, UserCog, User, Eye, Sparkles } from 'lucide-react'

/**
 * Card de credenciais de DEMONSTRAÇÃO exibido na tela de login.
 *
 * Só deve ser renderizado em ambiente de dev ou demo (o componente pai decide,
 * via `import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true'`).
 *
 * ⚠️  Mantenha esta lista em sincronia com o seed:
 *     backend/src/prisma/seed-demo.ts
 */

const DEMO_PASSWORD = 'Demo@2025'

type DemoRole = {
  email: string
  label: string
  description: string
  icon: typeof Crown
  className: string
}

const DEMO_ROLES: DemoRole[] = [
  {
    email: 'superuser@sispat.demo',
    label: 'Superusuário',
    description: 'Controle total do sistema',
    icon: Crown,
    className: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    email: 'admin@sispat.demo',
    label: 'Administrador',
    description: 'Gestão do município',
    icon: Shield,
    className: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    email: 'supervisor@sispat.demo',
    label: 'Supervisor',
    description: 'Gestão operacional',
    icon: UserCog,
    className: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  },
  {
    email: 'usuario@sispat.demo',
    label: 'Usuário',
    description: 'Operação do dia a dia',
    icon: User,
    className: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
  {
    email: 'visualizador@sispat.demo',
    label: 'Visualizador',
    description: 'Somente leitura',
    icon: Eye,
    className: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100',
  },
]

interface DemoCredentialsProps {
  /** Preenche o formulário de login com a conta escolhida. */
  onSelect: (email: string, password: string) => void
  disabled?: boolean
}

export function DemoCredentials({ onSelect, disabled }: DemoCredentialsProps) {
  return (
    <div className="mt-4 rounded-xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-foreground">
          Credenciais de demonstração
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Clique em um perfil para preencher o login automaticamente. Senha de
        todas as contas:{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
          {DEMO_PASSWORD}
        </code>
      </p>
      <div className="space-y-2">
        {DEMO_ROLES.map((role) => {
          const Icon = role.icon
          return (
            <button
              key={role.email}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(role.email, DEMO_PASSWORD)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${role.className}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium leading-tight">
                  {role.label}
                </span>
                <span className="truncate text-xs opacity-75">
                  {role.email}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
