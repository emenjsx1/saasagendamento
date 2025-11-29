import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MarketplaceBusinessCard } from '@/components/MarketplaceBusinessCard';
import { useMarketplace } from '@/hooks/use-marketplace';
import { businessCategories, getAllProvinces, BusinessCategory } from '@/utils/mozambique-locations';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { useUserType } from '@/hooks/use-user-type';
import { ClientBottomNavigator } from '@/components/ClientBottomNavigator';

export default function MarketplacePage() {
  const { T } = useCurrency();
  const { user } = useSession();
  const { userType } = useUserType();
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'newest'>('rating');
  const [clientProvince, setClientProvince] = useState<string | null>(null);

  // Carregar província do cliente se estiver logado
  useEffect(() => {
    const loadClientProvince = async () => {
      if (user && userType === 'client') {
        const { data } = await supabase
          .from('profiles')
          .select('address')
          .eq('id', user.id)
          .single();

        if (data?.address) {
          // Extrair província do campo address (formato: "Província, Cidade" ou só "Província")
          const province = data.address.split(',')[0].trim();
          setClientProvince(province);
          // Se não houver filtro selecionado, usar a província do cliente
          if (selectedProvince === 'all') {
            setSelectedProvince(province);
          }
        }
      }
    };
    loadClientProvince();
  }, [user, userType, selectedProvince]);

  const { businesses, isLoading, error, totalCount } = useMarketplace({
    category: selectedCategory,
    province: selectedProvince,
    searchQuery: searchQuery.trim() || undefined,
    sortBy,
  });

  const hasActiveFilters = selectedCategory !== 'all' || selectedProvince !== 'all' || searchQuery.trim() !== '';
  const isAutoFiltered = clientProvince && selectedProvince === clientProvince && selectedProvince !== 'all';

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedProvince(clientProvince || 'all'); // Manter província do cliente se existir
    setSearchQuery('');
    setSortBy('rating');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{T('Marketplace', 'Marketplace')}</h1>
          <p className="text-gray-300">
            {T('Descubra e agende com os melhores negócios', 'Discover and book with the best businesses')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              {T('Filtros', 'Filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-6">
            {/* Mensagem de filtro automático */}
            {isAutoFiltered && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  {T(
                    `Mostrando negócios da sua província: ${selectedProvince}. Você pode alterar o filtro acima.`,
                    `Showing businesses from your province: ${selectedProvince}. You can change the filter above.`
                  )}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={T('Buscar por nome ou descrição...', 'Search by name or description...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 sm:h-11"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as BusinessCategory | 'all')}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder={T('Todas as categorias', 'All categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todas as categorias', 'All categories')}</SelectItem>
                  {businessCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Province Filter */}
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder={T('Todas as províncias', 'All provinces')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todas as províncias', 'All provinces')}</SelectItem>
                  {getAllProvinces().map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort and Clear Filters */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-sm font-medium whitespace-nowrap">{T('Ordenar por:', 'Sort by:')}</span>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'rating' | 'name' | 'newest')}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">{T('Melhor avaliados', 'Best rated')}</SelectItem>
                      <SelectItem value="name">{T('Nome (A-Z)', 'Name (A-Z)')}</SelectItem>
                      <SelectItem value="newest">{T('Mais recentes', 'Newest')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {T('Limpar filtros', 'Clear filters')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">{T('Erro ao carregar negócios.', 'Error loading businesses.')}</p>
            </CardContent>
          </Card>
        ) : businesses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg mb-2">
                {T('Nenhum negócio encontrado.', 'No businesses found.')}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  {T('Limpar filtros', 'Clear filters')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? T('negócio encontrado', 'business found') : T('negócios encontrados', 'businesses found')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {businesses.map((business) => (
                <MarketplaceBusinessCard key={business.id} business={business} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigator (Mobile Only) - Mostrar apenas se cliente estiver logado */}
      {user && userType === 'client' && <ClientBottomNavigator />}
    </div>
  );
}

