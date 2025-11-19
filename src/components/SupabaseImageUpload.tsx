import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupabaseImageUploadProps {
  bucket: string;
  pathPrefix: string; // Usually the user ID or business ID
  fileName: string; // e.g., 'logo.png' or 'banner.jpg'
  label: string;
  currentUrl: string | null;
  onUploadSuccess: (url: string) => void;
}

const SupabaseImageUpload: React.FC<SupabaseImageUploadProps> = ({
  bucket,
  pathPrefix,
  fileName,
  label,
  currentUrl,
  onUploadSuccess,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  React.useEffect(() => {
    setPreviewUrl(currentUrl);
  }, [currentUrl]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const filePath = `${pathPrefix}/${fileName}`;

    try {
      // 1. Upload the file
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing file
        });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL pública.");
      }

      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl);
      toast.success(`${label} carregado com sucesso!`);

    } catch (error: any) {
      toast.error(`Erro ao carregar ${label}: ${error.message}`);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }, [bucket, pathPrefix, fileName, label, onUploadSuccess]);

  const handleRemove = async () => {
    if (!currentUrl) return;

    setIsUploading(true);
    const filePath = `${pathPrefix}/${fileName}`;

    try {
      // 1. Delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // 2. Clear state and notify parent
      setPreviewUrl(null);
      onUploadSuccess(''); // Pass empty string to clear the URL in the form
      toast.success(`${label} removido com sucesso.`);

    } catch (error: any) {
      toast.error(`Erro ao remover ${label}: ${error.message}`);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center space-x-4">
        <div className={cn(
          "relative w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed",
          previewUrl ? "border-transparent" : "border-gray-300"
        )}>
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt={label} 
                className="w-full h-full object-cover rounded-lg" 
              />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 opacity-80"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Image className="h-8 w-8 text-gray-400" />
          )}
        </div>
        
        <div className="flex-grow">
          <Input
            id={`file-upload-${fileName}`}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <Label htmlFor={`file-upload-${fileName}`} className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            "bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer"
          )}>
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? 'Carregando...' : 'Escolher Imagem'}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">Máx. 5MB. Formatos: JPG, PNG.</p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseImageUpload;