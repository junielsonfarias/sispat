import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSearch } from '@/contexts/SearchContext'
import { useAuth } from '@/hooks/useAuth'
import { Building, File, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const GlobalSearch = () => {
  const { isOpen, closeSearch } = useSearch()
  const navigate = useNavigate()
  const { patrimonios } = usePatrimonio()
  const { users } = useAuth()
  const { municipalities } = useMunicipalities()

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
          {patrimonios.slice(0, 5).map((p) => (
            <CommandItem
              key={p.id}
              onSelect={() =>
                runCommand(() => navigate(`/bens-cadastrados/ver/${p.id}`))
              }
            >
              <File className="mr-2 h-4 w-4" />
              <span>
                {p.numero_patrimonio} - {p.descricao}
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

        <CommandGroup heading="Municípios">
          {municipalities.slice(0, 5).map((m) => (
            <CommandItem
              key={m.id}
              onSelect={() =>
                runCommand(() => navigate(`/superuser/municipalities`))
              }
            >
              <Building className="mr-2 h-4 w-4" />
              <span>{m.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
