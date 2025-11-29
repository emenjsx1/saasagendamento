import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { MapPin, Phone, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketplaceBusiness } from '@/hooks/use-marketplace';
import { useCurrency } from '@/contexts/CurrencyContext';

interface MarketplaceBusinessCardProps {
  business: MarketplaceBusiness;
}

export function MarketplaceBusinessCard({ business }: MarketplaceBusinessCardProps) {
  const { T } = useCurrency();

  const bookingUrl = business.slug 
    ? `/book/${business.slug}` 
    : `/book/${business.id}`;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      {/* Cover Photo */}
      {business.cover_photo_url ? (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={business.cover_photo_url}
            alt={business.name}
            className="w-full h-full object-cover"
          />
          {business.category && (
            <Badge 
              className="absolute top-2 right-2 bg-black/70 text-white border-0"
              variant="outline"
            >
              {business.category}
            </Badge>
          )}
        </div>
      ) : (
        <div 
          className="h-48 w-full flex items-center justify-center"
          style={{ 
            backgroundColor: business.theme_color || '#2563eb',
          }}
        >
          <Store className="h-16 w-16 text-white opacity-50" />
          {business.category && (
            <Badge 
              className="absolute top-2 right-2 bg-black/70 text-white border-0"
              variant="outline"
            >
              {business.category}
            </Badge>
          )}
        </div>
      )}

      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Logo and Name */}
        <div className="flex items-start gap-3 mb-3">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ 
                backgroundColor: business.theme_color || '#2563eb',
              }}
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{business.name}</h3>
            {(business.province || business.city) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {[business.city, business.province].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-shrink-0">
            {business.description}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <StarRating 
              rating={business.average_rating} 
              showNumber 
              size="sm"
            />
            <span className="text-xs text-muted-foreground">
              ({business.total_ratings} {business.total_ratings === 1 ? 'avaliação' : 'avaliações'})
            </span>
          </div>
        </div>

        {/* Contact Info */}
        {business.phone && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3 flex-shrink-0">
            <Phone className="h-3 w-3" />
            <span>{business.phone}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-auto pt-3 border-t">
          <Link to={bookingUrl}>
            <Button 
              className="w-full"
              style={{ 
                backgroundColor: business.theme_color || undefined,
              }}
            >
              {T('Ver Detalhes', 'View Details')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

