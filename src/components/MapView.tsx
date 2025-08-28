import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  Navigation,
  Info,
  Building2,
  Home,
  Warehouse,
  Store,
  School,
  Hospital,
  Church,
  Factory,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Imovel {
  id: string;
  numero_patrimonio: string;
  endereco: string;
  descricao: string;
  area_total?: number;
  area_construida?: number;
  valor_aquisicao?: number;
  data_aquisicao?: string;
  municipality_id: string;
  municipality_name: string;
  latitude?: number;
  longitude?: number;
  tipo?: string;
  setor?: string;
}

interface MapViewProps {
  imoveis: Imovel[];
  onImovelSelect?: (imovel: Imovel) => void;
  className?: string;
}

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  imovel: Imovel;
  icon: string;
}

const TIPO_ICONS = {
  residencial: Home,
  comercial: Store,
  industrial: Factory,
  educacional: School,
  saude: Hospital,
  religioso: Church,
  armazem: Warehouse,
  predio: Building2,
  default: Building2,
};

export const MapView: React.FC<MapViewProps> = ({
  imoveis,
  onImovelSelect,
  className,
}) => {
  const [selectedImovel, setSelectedImovel] = useState<Imovel | null>(null);
  const [filteredImoveis, setFilteredImoveis] = useState<Imovel[]>(imoveis);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [mapType, setMapType] = useState<'street' | 'satellite' | 'hybrid'>(
    'street'
  );
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filtrar imóveis
  const filterImoveis = useCallback(() => {
    const filtered = imoveis.filter(imovel => {
      const matchesSearch =
        searchTerm === '' ||
        imovel.numero_patrimonio
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        imovel.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        imovel.endereco.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo =
        selectedTipo === 'todos' || imovel.tipo === selectedTipo;
      const matchesSetor =
        selectedSetor === 'todos' || imovel.setor === selectedSetor;

      return matchesSearch && matchesTipo && matchesSetor;
    });

    setFilteredImoveis(filtered);
  }, [imoveis, searchTerm, selectedTipo, selectedSetor]);

  // Aplicar filtros
  useEffect(() => {
    filterImoveis();
  }, [filterImoveis]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const mapOptions = {
      center: { lat: -23.5505, lng: -46.6333 }, // São Paulo
      zoom: 12,
      mapTypeId: mapType === 'satellite' ? 'satellite' : 'roadmap',
      styles:
        mapType === 'hybrid'
          ? [
              {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#7c93a3' }],
              },
            ]
          : [],
    };

    mapInstanceRef.current = new window.google.maps.Map(
      mapRef.current,
      mapOptions
    );

    // Adicionar controles personalizados
    addCustomControls();
  }, [mapType]);

  // Adicionar marcadores
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Limpar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Adicionar novos marcadores
    filteredImoveis.forEach(imovel => {
      if (imovel.latitude && imovel.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: imovel.latitude, lng: imovel.longitude },
          map: mapInstanceRef.current,
          title: imovel.numero_patrimonio,
          icon: {
            url: getMarkerIcon(imovel.tipo || 'default'),
            scaledSize: new window.google.maps.Size(32, 32),
          },
        });

        // Info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(imovel),
        });

        marker.addListener('click', () => {
          setSelectedImovel(imovel);
          onImovelSelect?.(imovel);
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });

    // Ajustar bounds se houver marcadores
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [filteredImoveis, onImovelSelect]);

  const addCustomControls = () => {
    if (!mapInstanceRef.current) return;

    // Controle de tipo de mapa
    const mapTypeControl = document.createElement('div');
    mapTypeControl.className = 'map-control';
    mapTypeControl.innerHTML = `
      <button class="map-btn" onclick="window.toggleMapType()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>
    `;
    mapInstanceRef.current.controls[
      window.google.maps.ControlPosition.TOP_RIGHT
    ].push(mapTypeControl);

    // Controle de localização
    const locationControl = document.createElement('div');
    locationControl.className = 'map-control';
    locationControl.innerHTML = `
      <button class="map-btn" onclick="window.getCurrentLocation()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
        </svg>
      </button>
    `;
    mapInstanceRef.current.controls[
      window.google.maps.ControlPosition.TOP_RIGHT
    ].push(locationControl);

    // Funções globais
    (window as any).toggleMapType = () => {
      setMapType(prev => (prev === 'street' ? 'satellite' : 'street'));
    };
    (window as any).getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            mapInstanceRef.current.setCenter(pos);
            mapInstanceRef.current.setZoom(15);
          },
          () => {
            toast({
              title: 'Erro de Localização',
              description: 'Não foi possível obter sua localização',
              variant: 'destructive',
            });
          }
        );
      }
    };
  };

  const getMarkerIcon = (tipo: string): string => {
    const iconMap: Record<string, string> = {
      residencial: '🏠',
      comercial: '🏪',
      industrial: '🏭',
      educacional: '🏫',
      saude: '🏥',
      religioso: '⛪',
      armazem: '🏢',
      predio: '🏢',
      default: '🏢',
    };
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#1976d2" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" font-size="16" fill="white">${iconMap[tipo] || iconMap.default}</text>
      </svg>
    `)}`;
  };

  const createInfoWindowContent = (imovel: Imovel): string => {
    return `
      <div style="padding: 8px; max-width: 250px;">
        <h3 style="margin: 0 0 8px 0; color: #1976d2; font-size: 14px;">
          ${imovel.numero_patrimonio}
        </h3>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          ${imovel.descricao}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 11px; color: #999;">
          ${imovel.endereco}
        </p>
        ${imovel.area_total ? `<p style="margin: 0; font-size: 11px; color: #999;">Área: ${imovel.area_total}m²</p>` : ''}
      </div>
    `;
  };

  const handleImovelClick = (imovel: Imovel) => {
    setSelectedImovel(imovel);
    onImovelSelect?.(imovel);

    // Centralizar mapa no imóvel
    if (imovel.latitude && imovel.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({
        lat: imovel.latitude,
        lng: imovel.longitude,
      });
      mapInstanceRef.current.setZoom(16);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTipo('todos');
    setSelectedSetor('todos');
  };

  const tipos = [
    'todos',
    'residencial',
    'comercial',
    'industrial',
    'educacional',
    'saude',
    'religioso',
    'armazem',
    'predio',
  ];
  const setores = [
    'todos',
    ...Array.from(new Set(imoveis.map(i => i.setor).filter(Boolean))),
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Controles */}
      <Card className='mb-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MapPin className='h-5 w-5' />
            Mapa Interativo de Imóveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {/* Busca */}
            <div className='relative'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Buscar imóveis...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>

            {/* Filtro por tipo */}
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger>
                <SelectValue placeholder='Tipo de imóvel' />
              </SelectTrigger>
              <SelectContent>
                {tipos.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo === 'todos'
                      ? 'Todos os tipos'
                      : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por setor */}
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger>
                <SelectValue placeholder='Setor' />
              </SelectTrigger>
              <SelectContent>
                {setores.map(setor => (
                  <SelectItem key={setor} value={setor}>
                    {setor === 'todos' ? 'Todos os setores' : setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botões de ação */}
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={clearFilters}>
                <Filter className='h-4 w-4 mr-1' />
                Limpar
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowInfoPanel(!showInfoPanel)}
              >
                <Info className='h-4 w-4 mr-1' />
                {showInfoPanel ? 'Ocultar' : 'Mostrar'} Info
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className='mt-4 flex gap-4 text-sm text-muted-foreground'>
            <span>Total: {imoveis.length} imóveis</span>
            <span>Filtrados: {filteredImoveis.length} imóveis</span>
            <span>
              Com coordenadas:{' '}
              {imoveis.filter(i => i.latitude && i.longitude).length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Mapa e Painel de Informações */}
      <div className='flex-1 flex gap-4'>
        {/* Mapa */}
        <div className='flex-1 relative'>
          <div
            ref={mapRef}
            className='w-full h-full rounded-lg border'
            style={{ minHeight: '500px' }}
          />

          {/* Controles do mapa */}
          <div className='absolute top-4 left-4 flex flex-col gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => setMapType('street')}
              className={
                mapType === 'street' ? 'bg-primary text-primary-foreground' : ''
              }
            >
              Rua
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => setMapType('satellite')}
              className={
                mapType === 'satellite'
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }
            >
              Satélite
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => setMapType('hybrid')}
              className={
                mapType === 'hybrid' ? 'bg-primary text-primary-foreground' : ''
              }
            >
              Híbrido
            </Button>
          </div>
        </div>

        {/* Painel de Informações */}
        {showInfoPanel && (
          <Card className='w-80'>
            <CardHeader>
              <CardTitle className='text-lg'>Imóveis</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='max-h-96 overflow-y-auto'>
                {filteredImoveis.length === 0 ? (
                  <div className='p-4 text-center text-muted-foreground'>
                    Nenhum imóvel encontrado
                  </div>
                ) : (
                  filteredImoveis.map(imovel => (
                    <div
                      key={imovel.id}
                      className={cn(
                        'p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedImovel?.id === imovel.id && 'bg-muted'
                      )}
                      onClick={() => handleImovelClick(imovel)}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <h4 className='font-medium text-sm'>
                            {imovel.numero_patrimonio}
                          </h4>
                          <p className='text-xs text-muted-foreground mt-1'>
                            {imovel.descricao}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>
                            {imovel.endereco}
                          </p>
                        </div>
                        <div className='flex flex-col items-end gap-1'>
                          {imovel.tipo && (
                            <Badge variant='secondary' className='text-xs'>
                              {imovel.tipo}
                            </Badge>
                          )}
                          {imovel.area_total && (
                            <span className='text-xs text-muted-foreground'>
                              {imovel.area_total}m²
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estilos para controles do mapa */}
      <style jsx>{`
        .map-control {
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .map-btn {
          background: white;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-btn:hover {
          background: #f5f5f5;
        }
      `}</style>
    </div>
  );
};
