import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()

  // Navegação Principal
  useHotkeys('ctrl+h', () => navigate('/'), { 
    preventDefault: true,
    description: 'Ir para Dashboard'
  })

  useHotkeys('ctrl+b', () => navigate('/bens-cadastrados'), { 
    preventDefault: true,
    description: 'Ir para Bens Cadastrados'
  })

  useHotkeys('ctrl+i', () => navigate('/imoveis'), { 
    preventDefault: true,
    description: 'Ir para Imóveis'
  })

  useHotkeys('ctrl+r', () => navigate('/relatorios'), { 
    preventDefault: true,
    description: 'Ir para Relatórios'
  })

  useHotkeys('ctrl+e', () => navigate('/gerar-etiquetas'), { 
    preventDefault: true,
    description: 'Ir para Gerar Etiquetas'
  })

  // Ações Rápidas
  useHotkeys('ctrl+n', () => navigate('/bens-cadastrados/novo'), { 
    preventDefault: true,
    description: 'Novo Cadastro de Bem'
  })

  useHotkeys('ctrl+shift+n', () => navigate('/imoveis/novo'), { 
    preventDefault: true,
    description: 'Novo Cadastro de Imóvel'
  })

  // Busca Global
  useHotkeys('ctrl+k', () => {
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }, { 
    preventDefault: true,
    description: 'Abrir Busca Global'
  })

  // Fechar Modais
  useHotkeys('esc', () => {
    const closeButtons = document.querySelectorAll('[data-close-modal]')
    closeButtons.forEach(btn => (btn as HTMLElement).click())
  }, {
    description: 'Fechar Modal'
  })

  return {
    shortcuts: [
      { keys: 'Ctrl + H', description: 'Ir para Dashboard' },
      { keys: 'Ctrl + B', description: 'Ir para Bens Cadastrados' },
      { keys: 'Ctrl + I', description: 'Ir para Imóveis' },
      { keys: 'Ctrl + R', description: 'Ir para Relatórios' },
      { keys: 'Ctrl + E', description: 'Ir para Gerar Etiquetas' },
      { keys: 'Ctrl + N', description: 'Novo Cadastro de Bem' },
      { keys: 'Ctrl + Shift + N', description: 'Novo Cadastro de Imóvel' },
      { keys: 'Ctrl + K', description: 'Abrir Busca Global' },
      { keys: 'Esc', description: 'Fechar Modal' },
      { keys: '?', description: 'Mostrar Atalhos' },
    ]
  }
}

