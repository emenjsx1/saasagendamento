import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 'md',
  showNumber = false,
  className 
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(sizeClasses[size], 'fill-yellow-400 text-yellow-400')}
          />
        ))}
        {hasHalfStar && (
          <div className="relative inline-block">
            <Star
              className={cn(sizeClasses[size], 'text-gray-300')}
            />
            <div className="absolute left-0 top-0 overflow-hidden" style={{ width: '50%', height: '100%' }}>
              <Star
                className={cn(sizeClasses[size], 'fill-yellow-400 text-yellow-400')}
              />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(sizeClasses[size], 'text-gray-300')}
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

interface InteractiveStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function InteractiveStarRating({
  rating,
  onRatingChange,
  maxRating = 5,
  size = 'md',
  disabled = false,
  className
}: InteractiveStarRatingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => !disabled && onRatingChange(starValue)}
            disabled={disabled}
            className={cn(
              'transition-colors',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110',
              isFilled ? 'text-yellow-400' : 'text-gray-300'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled && 'fill-yellow-400'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

