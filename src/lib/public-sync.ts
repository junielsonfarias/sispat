/**
 * Utilitários para sincronização de dados públicos
 */

export interface PublicSyncStatus {
  municipalities: boolean;
  publicSettings: boolean;
  patrimonios: boolean;
  imoveis: boolean;
}

/**
 * Verifica se os dados públicos estão sincronizados
 */
export function checkPublicDataSync(): PublicSyncStatus {
  const status: PublicSyncStatus = {
    municipalities: false,
    publicSettings: false,
    patrimonios: false,
    imoveis: false,
  };

  // Verificar municípios
  const municipalities = localStorage.getItem('sispat_municipalities');
  if (municipalities) {
    try {
      const parsed = JSON.parse(municipalities);
      status.municipalities = Array.isArray(parsed) && parsed.length > 0;
    } catch {
      status.municipalities = false;
    }
  }

  // Verificar configurações públicas
  const publicSettings = localStorage.getItem('sispat_public_search_settings');
  if (publicSettings) {
    try {
      const parsed = JSON.parse(publicSettings);
      status.publicSettings =
        parsed.isPublicSearchEnabled &&
        Array.isArray(parsed.publicMunicipalityIds);
    } catch {
      status.publicSettings = false;
    }
  }

  // Verificar patrimônios
  const patrimonios = localStorage.getItem('sispat_patrimonios');
  if (patrimonios) {
    try {
      const parsed = JSON.parse(patrimonios);
      status.patrimonios = Array.isArray(parsed);
    } catch {
      status.patrimonios = false;
    }
  }

  // Verificar imóveis
  const imoveis = localStorage.getItem('sispat_imoveis');
  if (imoveis) {
    try {
      const parsed = JSON.parse(imoveis);
      status.imoveis = Array.isArray(parsed);
    } catch {
      status.imoveis = false;
    }
  }

  return status;
}

/**
 * Força a sincronização dos dados públicos usando o novo endpoint
 */
export async function forcePublicDataSync(): Promise<void> {
  console.log('🔄 Forçando sincronização de dados públicos...');

  try {
    // Usar o novo endpoint de sincronização
    const syncResponse = await fetch('/api/sync/public-data');

    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ Dados de sincronização recebidos:', syncData);

      // Salvar municípios
      if (syncData.municipalities && Array.isArray(syncData.municipalities)) {
        localStorage.setItem(
          'sispat_municipalities',
          JSON.stringify(syncData.municipalities)
        );
        console.log(
          '✅ Municípios sincronizados:',
          syncData.municipalities.length
        );
      }

      // Salvar configurações públicas
      if (syncData.publicSettings) {
        localStorage.setItem(
          'sispat_public_search_settings',
          JSON.stringify(syncData.publicSettings)
        );
        console.log('✅ Configurações públicas atualizadas');
      }

      // Salvar patrimônios
      if (syncData.patrimonios && Array.isArray(syncData.patrimonios)) {
        localStorage.setItem(
          'sispat_patrimonios',
          JSON.stringify(syncData.patrimonios)
        );
        console.log(
          '✅ Patrimônios sincronizados:',
          syncData.patrimonios.length
        );
      }

      // Salvar dados agrupados por município
      if (syncData.patrimoniosByMunicipality) {
        localStorage.setItem(
          'sispat_patrimonios_by_municipality',
          JSON.stringify(syncData.patrimoniosByMunicipality)
        );
        console.log('✅ Patrimônios agrupados por município sincronizados');
      }

      console.log('🎯 Sincronização de dados públicos concluída!');
      console.log('📊 Resumo:', {
        municipalities: syncData.totalMunicipalities,
        patrimonios: syncData.totalPatrimonios,
        timestamp: syncData.syncTimestamp,
      });
    } else {
      console.error(
        '❌ Erro na resposta da sincronização:',
        syncResponse.status,
        syncResponse.statusText
      );
      // Fallback para o método antigo se o novo endpoint falhar
      await forcePublicDataSyncLegacy();
    }
  } catch (error) {
    console.error('❌ Erro na sincronização de dados públicos:', error);
    // Fallback para o método antigo se o novo endpoint falhar
    await forcePublicDataSyncLegacy();
  }
}

/**
 * Método legado de sincronização (fallback)
 */
async function forcePublicDataSyncLegacy(): Promise<void> {
  console.log('🔄 Usando método legado de sincronização...');

  try {
    // Buscar municípios públicos
    const municipalitiesResponse = await fetch('/api/municipalities/public');
    let municipalities: any[] = [];

    if (municipalitiesResponse.ok) {
      municipalities = await municipalitiesResponse.json();
      if (Array.isArray(municipalities)) {
        localStorage.setItem(
          'sispat_municipalities',
          JSON.stringify(municipalities)
        );
        console.log(
          '✅ Municípios sincronizados (legado):',
          municipalities.length
        );

        // Atualizar configurações públicas para incluir todos os municípios
        const allMunicipalityIds = municipalities.map((m: any) => m.id);
        const publicSettings = {
          isPublicSearchEnabled: true,
          publicMunicipalityIds: allMunicipalityIds,
        };
        localStorage.setItem(
          'sispat_public_search_settings',
          JSON.stringify(publicSettings)
        );
        console.log('✅ Configurações públicas atualizadas (legado)');
      }
    }

    // Buscar dados públicos de patrimônios para cada município
    const allMunicipalityIds = municipalities.map((m: any) => m.id);
    for (const municipalityId of allMunicipalityIds) {
      try {
        const patrimoniosResponse = await fetch(
          `/api/patrimonios/public?municipalityId=${municipalityId}&limit=100`
        );
        if (patrimoniosResponse.ok) {
          const patrimonios = await patrimoniosResponse.json();
          if (Array.isArray(patrimonios) && patrimonios.length > 0) {
            // Mesclar com patrimônios existentes
            const existing = JSON.parse(
              localStorage.getItem('sispat_patrimonios') || '[]'
            );
            const merged = [...existing, ...patrimonios];
            const unique = merged.filter(
              (item, index, arr) =>
                arr.findIndex(i => i.id === item.id) === index
            );
            localStorage.setItem('sispat_patrimonios', JSON.stringify(unique));
            console.log(
              `✅ Patrimônios públicos sincronizados para ${municipalityId} (legado):`,
              patrimonios.length
            );
          }
        }
      } catch (error) {
        console.log(
          `ℹ️ Patrimônios públicos não disponíveis para município ${municipalityId}`
        );
      }
    }

    console.log('🎯 Sincronização legada concluída!');
  } catch (error) {
    console.error('❌ Erro na sincronização legada:', error);
  }
}

/**
 * Gera URL pública para QR Code
 */
export function generatePublicQRUrl(asset: {
  id: string;
  assetType: 'bem' | 'imovel';
  numero_patrimonio?: string;
}): string {
  const baseUrl = `${window.location.origin}/consulta-publica`;

  if (asset.assetType === 'imovel') {
    return `${baseUrl}/imovel/${asset.id}`;
  } else {
    return `${baseUrl}/${asset.numero_patrimonio || asset.id}`;
  }
}

/**
 * Verifica se uma URL é válida para consulta pública
 */
export function isValidPublicUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/consulta-publica');
  } catch {
    return false;
  }
}
