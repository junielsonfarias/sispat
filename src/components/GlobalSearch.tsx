import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useSearch } from '@/contexts/SearchContext'
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { useAuth } from '@/hooks/useAuth'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { File, User, Building } from 'lucide-react'

export const GlobalSearch = () => {
  const { isOpen, closeSearch } = useSearch()
  const navigate = useNavigate()
  // Só carrega o conjunto completo quando a busca está ABERTA — este componente
  // fica sempre montado no layout; sem o gate, dispararia o load a cada sessão.
  const { data: patrimonios = [] } = useAllPatrimonios({ enabled: isOpen })
  const { users } = useAuth()

  const runCommand = (command: () => unknown) => {
    closeSearch()
    command()
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={closeSearch}>
      <CommandInput placeholder="Pesquisar em todo o sistema..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Bens">
          {Array.isArray(patrimonios) && patrimonios.slice(0, 5).map((p) => (
            <CommandItem
              key={p.id}
              onSelect={() =>
                runCommand(() => navigate(`/bens-cadastrados/ver/${p.id}`))
              }
            >
              <File className="mr-2 h-4 w-4" />
              <span>
                {p.numero_patrimonio} - {p.descricao_bem}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Usuários">
          {users
            .filter((u) => u.role !== 'superuser')
            .slice(0, 5)
            .map((u) => (
              <CommandItem
                key={u.id}
                onSelect={() =>
                  runCommand(() => navigate(`/configuracoes/usuarios`))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>
                  {u.name} - {u.email}
                </span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Sistema">
          <CommandItem
            onSelect={() =>
              runCommand(() => navigate(`/superuser/dashboard`))
            }
          >
            <Building className="mr-2 h-4 w-4" />
            <span>{MUNICIPALITY_NAME}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
