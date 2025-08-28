import { useEffect } from 'react'

interface PublicSEOProps {
  title?: string
  description?: string
  municipalityName?: string
  assetNumber?: string
  assetDescription?: string
}

/**
 * Componente para melhorar SEO das páginas públicas
 */
export const PublicSEO = ({ 
  title = 'Consulta Pública de Bens',
  description = 'Sistema de consulta pública de patrimônio e imóveis municipais',
  municipalityName,
  assetNumber,
  assetDescription
}: PublicSEOProps) => {
  useEffect(() => {
    // Construir título dinâmico
    let dynamicTitle = title
    if (municipalityName) {
      dynamicTitle = `${title} - ${municipalityName}`
    }
    if (assetNumber && assetDescription) {
      dynamicTitle = `${assetNumber} - ${assetDescription} | ${municipalityName || 'SISPAT'}`
    }

    // Construir descrição dinâmica
    let dynamicDescription = description
    if (assetDescription && municipalityName) {
      dynamicDescription = `Consulte informações públicas sobre ${assetDescription} (${assetNumber}) do município de ${municipalityName}.`
    } else if (municipalityName) {
      dynamicDescription = `Consulta pública de bens e imóveis do município de ${municipalityName}.`
    }

    // Atualizar meta tags
    document.title = dynamicTitle

    // Atualizar ou criar meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', dynamicDescription)

    // Atualizar ou criar meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]')
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta')
      metaKeywords.setAttribute('name', 'keywords')
      document.head.appendChild(metaKeywords)
    }
    const keywords = [
      'consulta pública',
      'patrimônio público',
      'transparência',
      municipalityName,
      'SISPAT',
      'bens públicos',
      'imóveis públicos'
    ].filter(Boolean).join(', ')
    metaKeywords.setAttribute('content', keywords)

    // Open Graph tags
    const updateOrCreateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', content)
    }

    updateOrCreateOGTag('og:title', dynamicTitle)
    updateOrCreateOGTag('og:description', dynamicDescription)
    updateOrCreateOGTag('og:type', 'website')
    updateOrCreateOGTag('og:url', window.location.href)

    // Twitter Card tags
    const updateOrCreateTwitterTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', name)
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', content)
    }

    updateOrCreateTwitterTag('twitter:card', 'summary')
    updateOrCreateTwitterTag('twitter:title', dynamicTitle)
    updateOrCreateTwitterTag('twitter:description', dynamicDescription)

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', window.location.href)

    // Schema.org structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "GovernmentService",
      "name": dynamicTitle,
      "description": dynamicDescription,
      "url": window.location.href,
      "provider": {
        "@type": "GovernmentOrganization",
        "name": municipalityName || "Município"
      }
    }

    // Remover script anterior se existir
    const existingScript = document.querySelector('script[type="application/ld+json"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Adicionar novo script
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)

  }, [title, description, municipalityName, assetNumber, assetDescription])

  return null // Componente invisível
}
