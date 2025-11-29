import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { mozambiqueProvinces } from '@/utils/mozambique-locations';
import { useCurrency } from '@/contexts/CurrencyContext';
import { loadGoogleMaps } from '@/utils/load-google-maps';

declare global {
  interface Window {
    google: any;
  }
}

interface LocationPickerProps {
  onLocationSelect: (province: string, city: string | null, coordinates?: { lat: number; lng: number }) => void;
  currentProvince?: string;
  currentCity?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  currentProvince,
  currentCity,
}) => {
  const { T } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  // Carregar Google Maps dinamicamente
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setMapLoaded(true);
        try {
          geocoderRef.current = new window.google.maps.Geocoder();
        } catch (error) {
          console.error('Erro ao criar Geocoder:', error);
          setMapLoaded(false);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar Google Maps:', error);
        const errorMessage = error.message || '';
        if (errorMessage.includes('billing') || errorMessage.includes('Billing')) {
          toast.error(T('Google Maps requer billing habilitado. Use a seleção manual de província abaixo.', 'Google Maps requires billing enabled. Please use manual province selection below.'));
        } else if (errorMessage.includes('not authorized') || errorMessage.includes('permission')) {
          toast.error(T('API do Google Maps não autorizada. Use a seleção manual de província.', 'Google Maps API not authorized. Please use manual province selection.'));
        } else {
          toast.error(T('Erro ao carregar o mapa. Use a seleção manual de província.', 'Error loading map. Please use manual province selection.'));
        }
        setMapLoaded(false);
      });
  }, [T]);

  // Inicializar mapa quando Google Maps estiver carregado
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    try {
      const mapOptions = {
        center: { lat: -25.969248, lng: 32.573228 }, // Maputo, Moçambique
        zoom: 8,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
    } catch (error: any) {
      console.error('Erro ao inicializar mapa:', error);
      if (error.message?.includes('BillingNotEnabled') || error.message?.includes('billing')) {
        toast.error(T('Google Maps requer billing habilitado. Use a seleção manual de província.', 'Google Maps requires billing enabled. Please use manual province selection.'));
      } else {
        toast.error(T('Erro ao carregar o mapa. Use a seleção manual de província.', 'Error loading map. Please use manual province selection.'));
      }
      setMapLoaded(false);
      return;
    }

    // Adicionar listener para cliques no mapa
    mapInstanceRef.current.addListener('click', (e: any) => {
      const location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setSelectedLocation(location);
      updateMarker(location);
      reverseGeocode(location);
    });
  }, [mapLoaded]);

  // Atualizar marcador no mapa
  const updateMarker = (location: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition(location);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: location,
        map: mapInstanceRef.current,
        draggable: true,
      });

      markerRef.current.addListener('dragend', (e: any) => {
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        setSelectedLocation(location);
        reverseGeocode(location);
      });
    }

    mapInstanceRef.current.setCenter(location);
  };

  // Reverse geocoding: converter coordenadas em endereço
  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    if (!geocoderRef.current) {
      toast.error(T('Serviço de geocodificação não disponível. Use a seleção manual.', 'Geocoding service not available. Please use manual selection.'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      geocoderRef.current.geocode(
        { location },
        (results: any[], status: string) => {
          setIsLoading(false);
          if (status === 'OK' && results.length > 0) {
            const result = results[0];
            const addressComponents = result.address_components;

            // Procurar província e cidade nos componentes do endereço
            let province = '';
            let city = '';

            for (const component of addressComponents) {
              const types = component.types;
              
              // Procurar administrative_area_level_1 (província/estado)
              if (types.includes('administrative_area_level_1')) {
                province = component.long_name;
              }
              
              // Procurar locality ou administrative_area_level_2 (cidade)
              if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                city = component.long_name;
              }
            }

            // Se não encontrou província, tentar mapear pelo nome do país/região
            if (!province) {
              // Verificar se está em Moçambique
              const country = addressComponents.find(c => c.types.includes('country'));
              if (country && (country.long_name === 'Mozambique' || country.short_name === 'MZ')) {
                // Tentar encontrar província pelo nome completo do endereço
                const fullAddress = result.formatted_address.toLowerCase();
                for (const prov of mozambiqueProvinces) {
                  const provNameLower = prov.name.toLowerCase();
                  // Verificar se o nome da província aparece no endereço
                  if (fullAddress.includes(provNameLower) || fullAddress.includes(provNameLower.split('(')[0].trim())) {
                    province = prov.name;
                    break;
                  }
                }
              }
            }

            // Mapear nomes alternativos de províncias
            if (province) {
              const provinceMappings: { [key: string]: string } = {
                'Maputo': 'Maputo (Cidade)',
                'Maputo Province': 'Maputo (Província)',
                'Gaza Province': 'Gaza',
                'Inhambane Province': 'Inhambane',
                'Sofala Province': 'Sofala',
                'Manica Province': 'Manica',
                'Tete Province': 'Tete',
                'Zambezia Province': 'Zambézia',
                'Zambézia Province': 'Zambézia',
                'Nampula Province': 'Nampula',
                'Cabo Delgado Province': 'Cabo Delgado',
                'Niassa Province': 'Niassa',
              };

              // Verificar se precisa mapear
              if (provinceMappings[province]) {
                province = provinceMappings[province];
              } else {
                // Tentar encontrar correspondência parcial
                for (const prov of mozambiqueProvinces) {
                  if (prov.name.toLowerCase().includes(province.toLowerCase()) || 
                      province.toLowerCase().includes(prov.name.toLowerCase().split('(')[0].trim())) {
                    province = prov.name;
                    break;
                  }
                }
              }
            }

            if (province) {
              onLocationSelect(province, city || null, location);
            } else {
              toast.error(T('Não foi possível identificar a província. Selecione manualmente.', 'Could not identify province. Please select manually.'));
            }
          } else if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
            toast.error(T('Erro de permissão na API do Google Maps. Use a seleção manual de província.', 'Google Maps API permission error. Please use manual province selection.'));
          } else {
            toast.error(T('Não foi possível identificar a localização. Use a seleção manual.', 'Could not identify location. Please use manual selection.'));
          }
        }
      );
      } catch (error: any) {
        setIsLoading(false);
        console.error('Erro no reverse geocoding:', error);
        if (error.message?.includes('not authorized') || error.message?.includes('permission')) {
          toast.error(T('API do Google Maps não autorizada. Use a seleção manual de província.', 'Google Maps API not authorized. Please use manual province selection.'));
        } else {
          toast.error(T('Erro ao processar localização. Use a seleção manual.', 'Error processing location. Please use manual selection.'));
        }
      }
  };

  // Detectar localização atual do usuário
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(T('Geolocalização não é suportada pelo seu navegador.', 'Geolocation is not supported by your browser.'));
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocation(location);
        updateMarker(location);
        reverseGeocode(location);
      },
      (error) => {
        setIsLoading(false);
        console.error('Erro ao obter localização:', error);
        toast.error(T('Não foi possível obter sua localização. Selecione no mapa.', 'Could not get your location. Please select on the map.'));
      }
    );
  };

  if (!mapLoaded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              {T('Carregando mapa...', 'Loading map...')}
            </p>
            <p className="text-xs text-gray-500">
              {T('Se o mapa não carregar, você pode selecionar a província manualmente no formulário.', 'If the map does not load, you can select the province manually in the form.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {currentProvince 
            ? T(`Localização: ${currentProvince}${currentCity ? `, ${currentCity}` : ''}`, `Location: ${currentProvince}${currentCity ? `, ${currentCity}` : ''}`)
            : T('Clique no mapa ou use sua localização atual', 'Click on the map or use your current location')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectCurrentLocation}
          disabled={isLoading || !mapLoaded}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {T('Usar Minha Localização', 'Use My Location')}
        </Button>
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border-2 border-gray-200"
          style={{ minHeight: '256px' }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {T('Clique no mapa para selecionar sua localização ou use o botão acima para detectar automaticamente.', 'Click on the map to select your location or use the button above to detect automatically.')}
      </p>
    </div>
  );
};

