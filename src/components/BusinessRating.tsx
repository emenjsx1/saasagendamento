import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating, InteractiveStarRating } from '@/components/StarRating';
import { useBusinessRatings } from '@/hooks/use-business-ratings';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessRatingProps {
  businessId: string;
  onRatingSubmitted?: () => void;
}

export function BusinessRating({ businessId, onRatingSubmitted }: BusinessRatingProps) {
  const { user } = useSession();
  const { T } = useCurrency();
  const { ratings, stats, isLoading, createRating, hasUserRated, userRating, refresh } = useBusinessRatings(businessId);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmitRating = async () => {
    if (!user) {
      toast.error(T('Você precisa estar logado para avaliar.', 'You need to be logged in to rate.'));
      return;
    }

    if (selectedRating === 0) {
      toast.error(T('Por favor, selecione uma avaliação.', 'Please select a rating.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createRating(businessId, selectedRating, comment);
      toast.success(T('Avaliação enviada com sucesso!', 'Rating submitted successfully!'));
      setSelectedRating(0);
      setComment('');
      setShowForm(false);
      await refresh();
      onRatingSubmitted?.();
    } catch (error: any) {
      toast.error(error.message || T('Erro ao enviar avaliação.', 'Error submitting rating.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{T('Avaliações', 'Ratings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && stats.total_ratings > 0 ? (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.average_rating.toFixed(1)}</div>
                <StarRating rating={stats.average_rating} size="lg" />
                <div className="text-sm text-muted-foreground mt-1">
                  {stats.total_ratings} {stats.total_ratings === 1 ? T('avaliação', 'rating') : T('avaliações', 'ratings')}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{T('Ainda não há avaliações.', 'No ratings yet.')}</p>
          )}

          {/* Rating Form */}
          {user && !hasUserRated && (
            <div className="pt-4 border-t">
              {!showForm ? (
                <Button onClick={() => setShowForm(true)} variant="outline">
                  {T('Avaliar este negócio', 'Rate this business')}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {T('Sua avaliação', 'Your rating')}
                    </label>
                    <InteractiveStarRating
                      rating={selectedRating}
                      onRatingChange={setSelectedRating}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {T('Comentário (opcional)', 'Comment (optional)')}
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={T('Deixe um comentário sobre sua experiência...', 'Leave a comment about your experience...')}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitRating}
                      disabled={isSubmitting || selectedRating === 0}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {T('Enviando...', 'Submitting...')}
                        </>
                      ) : (
                        T('Enviar Avaliação', 'Submit Rating')
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedRating(0);
                        setComment('');
                      }}
                    >
                      {T('Cancelar', 'Cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {user && hasUserRated && userRating && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {T('Você já avaliou este negócio:', 'You have already rated this business:')}
              </p>
              <div className="flex items-center gap-2">
                <StarRating rating={userRating.rating} size="sm" />
                {userRating.comment && (
                  <p className="text-sm">{userRating.comment}</p>
                )}
              </div>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground pt-4 border-t">
              {T('Faça login para avaliar este negócio.', 'Log in to rate this business.')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ratings List */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{T('Avaliações Recentes', 'Recent Ratings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ratings.slice(0, 10).map((rating) => (
                <div key={rating.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{rating.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(rating.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <StarRating rating={rating.rating} size="sm" />
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-muted-foreground mt-2">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

