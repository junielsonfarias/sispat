import { describe, it, expect } from 'vitest'
import { fromApi, toCreateBody, toUpdateBody } from '@/contexts/ManutencaoContext'

// Adaptadores de payload de manutenção (boundary front<->backend). Enums em PT no
// backend (preventiva/pendente/media) vs labels no front (Preventiva/A Fazer/Média).

describe('manutencao fromApi (backend -> front)', () => {
  const base = {
    id: 'm1',
    titulo: 'Trocar lâmpada',
    descricao: 'Sala 2',
    tipo: 'corretiva',
    prioridade: 'alta',
    status: 'em_andamento',
    dataPrevista: '2025-03-01T00:00:00.000Z',
    createdAt: '2025-02-01T00:00:00.000Z',
    municipalityId: 'mun-A',
  }

  it('mapeia titulo->title e enums PT->label', () => {
    const r = fromApi({ ...base })
    expect(r.title).toBe('Trocar lâmpada')
    expect(r.tipo).toBe('Corretiva')
    expect(r.priority).toBe('Alta')
    expect(r.status).toBe('Em Progresso')
  })

  it('converte datas para Date e responsavel null -> undefined', () => {
    const r = fromApi({ ...base, responsavel: null })
    expect(r.dueDate).toBeInstanceOf(Date)
    expect(r.createdAt).toBeInstanceOf(Date)
    expect(r.assignedTo).toBeUndefined()
  })

  it('valores desconhecidos caem nos defaults (Preventiva/Média/A Fazer)', () => {
    const r = fromApi({ ...base, tipo: 'xx', prioridade: 'xx', status: 'xx' })
    expect(r.tipo).toBe('Preventiva')
    expect(r.priority).toBe('Média')
    expect(r.status).toBe('A Fazer')
  })
})

describe('manutencao toCreateBody (front -> POST)', () => {
  it('mapeia title->titulo, enums label->PT e NÃO inclui status', () => {
    const body = toCreateBody({
      imovelId: 'i1',
      title: 'X',
      description: 'd',
      tipo: 'Preventiva',
      priority: 'Média',
      status: 'A Fazer',
      dueDate: new Date('2025-03-01'),
    } as never)
    expect(body).toMatchObject({ imovelId: 'i1', titulo: 'X', descricao: 'd', tipo: 'preventiva', prioridade: 'media' })
    expect('status' in body).toBe(false)
  })
})

describe('manutencao toUpdateBody (front -> PUT strict)', () => {
  it('só campos presentes; status label->PT; assignedTo vazio -> null', () => {
    const body = toUpdateBody({ status: 'Concluída', assignedTo: '' })
    expect(body).toEqual({ status: 'concluida', responsavel: null })
  })

  it('mapeia title->titulo e priority->prioridade quando presentes', () => {
    expect(toUpdateBody({ title: 'Novo', priority: 'Urgente' })).toEqual({ titulo: 'Novo', prioridade: 'urgente' })
  })

  it('objeto vazio quando nada muda', () => {
    expect(toUpdateBody({})).toEqual({})
  })
})
