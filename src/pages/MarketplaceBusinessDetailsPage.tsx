import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/StarRating';
import { BusinessRating } from '@/components/BusinessRating';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2, MapPin, Phone, Instagram, Facebook, ArrowLeft, Store } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { useBusinessRatings } from '@/hooks/use-business-ratings';

interface BusinessDetails {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  slug: string | null;
  theme_color: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  working_hours: any;
}

export default function MarketplaceBusinessDetailsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { T } = useCurrency();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { stats } = useBusinessRatings(businessId || null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) {
        setError('ID do negócio não fornecido');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .eq('is_public', true)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Negócio não encontrado');
          return;
        }

        setBusiness(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar negócio');
        toast.error(T('Erro ao carregar negócio.', 'Error loading business.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId, T]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error || T('Negócio não encontrado.', 'Business not found.')}</p>
            <Link to="/marketplace">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {T('Voltar ao Marketplace', 'Back to Marketplace')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookingUrl = business.slug 
    ? `/book/${business.slug}` 
    : `/book/${business.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with Cover Photo */}
      <div className="relative">
        {business.cover_photo_url ? (
          <div className="h-64 md:h-96 w-full overflow-hidden">
            <img
              src={business.cover_photo_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div
            className="h-64 md:h-96 w-full flex items-center justify-center"
            style={{ backgroundColor: business.theme_color || '#2563eb' }}
          >
            <Store className="h-24 w-24 text-white opacity-50" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="container mx-auto px-4">
            <Link to="/marketplace">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {T('Voltar', 'Back')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: business.theme_color || '#2563eb' }}
                    >
                      {business.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{business.name}</CardTitle>
                    {business.category && (
                      <Badge className="mb-2">{business.category}</Badge>
                    )}
                    {stats && stats.total_ratings > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <StarRating rating={stats.average_rating} showNumber size="sm" />
                        <span className="text-sm text-muted-foreground">
                          ({stats.total_ratings} {stats.total_ratings === 1 ? T('avaliação', 'rating') : T('avaliações', 'ratings')})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {business.description && (
                  <div>
                    <h3 className="font-semibold mb-2">{T('Sobre', 'About')}</h3>
                    <p className="text-muted-foreground">{business.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(business.province || business.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[business.city, business.province].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {business.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{business.address}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${business.phone}`} className="text-sm hover:underline">
                        {business.phone}
                      </a>
                    </div>
                  )}
                </div>

                {(business.instagram_url || business.facebook_url) && (
                  <div className="flex gap-4 pt-4 border-t">
                    {business.instagram_url && (
                      <a
                        href={business.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    )}
                    {business.facebook_url && (
                      <a
                        href={business.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ratings */}
            <BusinessRating businessId={business.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{T('Agendar', 'Book')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={bookingUrl}>
                  <Button
                    className="w-full"
                    size="lg"
                    style={{ backgroundColor: business.theme_color || undefined }}
                  >
                    {T('Agendar Agora', 'Book Now')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {business.working_hours && (
              <Card>
                <CardHeader>
                  <CardTitle>{T('Horários de Funcionamento', 'Working Hours')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(business.working_hours) && business.working_hours.map((day: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className={day.is_open ? '' : 'text-muted-foreground'}>
                          {day.day}
                        </span>
                        <span className={day.is_open ? '' : 'text-muted-foreground'}>
                          {day.is_open ? `${day.start_time} - ${day.end_time}` : T('Fechado', 'Closed')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

