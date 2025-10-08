import { Sector } from '@/types'

export interface SectorNode extends Sector {
  children: SectorNode[]
}

export const buildSectorTree = (sectors: Sector[]): SectorNode[] => {
  const sectorMap = new Map<string, SectorNode>()
  const tree: SectorNode[] = []

  sectors.forEach((sector) => {
    sectorMap.set(sector.id, { ...sector, children: [] })
  })

  sectors.forEach((sector) => {
    const node = sectorMap.get(sector.id)
    if (node) {
      if (sector.parentId && sectorMap.has(sector.parentId)) {
        const parent = sectorMap.get(sector.parentId)
        parent?.children.push(node)
      } else {
        tree.push(node)
      }
    }
  })

  return tree
}

export const getSubSectorIds = (
  sectorId: string,
  sectors: Sector[],
): string[] => {
  const subIds = new Set<string>()
  const queue = [sectorId]
  subIds.add(sectorId)

  while (queue.length > 0) {
    const currentId = queue.shift()
    const children = sectors.filter((s) => s.parentId === currentId)
    for (const child of children) {
      if (!subIds.has(child.id)) {
        subIds.add(child.id)
        queue.push(child.id)
      }
    }
  }

  return Array.from(subIds)
}

export const isCircularDependency = (
  sectorId: string,
  newParentId: string | null,
  sectors: Sector[],
): boolean => {
  if (!newParentId) return false
  if (sectorId === newParentId) return true

  let currentId: string | null = newParentId
  while (currentId) {
    if (currentId === sectorId) {
      return true
    }
    const parent = sectors.find((s) => s.id === currentId)
    currentId = parent ? parent.parentId : null
  }

  return false
}
