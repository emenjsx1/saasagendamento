import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { Loader2, User, Phone, Mail, Camera, Image, MapPin } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import SupabaseImageUpload from '@/components/SupabaseImageUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mozambiqueProvinces, getCitiesByProvince } from '@/utils/mozambique-locations';
import { LocationPicker } from '@/components/LocationPicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Esquema de validação para o perfil do cliente
const ClientProfileSchema = z.object({
  first_name: z.string().min(1, "O primeiro nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
  phone: z.string().optional(),
  address: z.string().optional(), // Província/Cidade (será formatado automaticamente)
  city: z.string().optional(), // Cidade separada
  avatar_url: z.string().optional(),
});

type ClientProfileFormValues = z.infer<typeof ClientProfileSchema>;

const ClientProfilePage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { T } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const availableCities = selectedProvince ? getCitiesByProvince(selectedProvince) : [];

  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(ClientProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      city: "",
      avatar_url: "",
    },
  });

  // Carregar dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, address, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        toast.error(T("Erro ao carregar perfil.", "Error loading profile."));
        console.error(error);
        return;
      }

      if (data) {
        setCurrentAvatarUrl(data.avatar_url || null);
        // Extrair província do campo address (formato: "Província, Cidade" ou só "Província")
        const addressParts = data.address ? data.address.split(',') : [];
        const province = addressParts[0]?.trim() || '';
        const city = addressParts[1]?.trim() || '';
        
        setSelectedProvince(province);
        setSelectedCity(city);
        form.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          address: data.address || "",
          city: city || "",
          avatar_url: data.avatar_url || "",
        });
      }
    };
    fetchProfile();
  }, [user, form, T]);

  // Submissão do formulário
  const onSubmit = async (values: ClientProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    // Formatar address como "Província, Cidade" se ambos existirem
    let formattedAddress = '';
    if (selectedProvince) {
      formattedAddress = selectedProvince;
      const cityValue = form.getValues('city');
      if (cityValue) {
        formattedAddress = `${selectedProvince}, ${cityValue}`;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        address: formattedAddress || null,
        avatar_url: values.avatar_url || null,
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (error) {
      toast.error(T("Erro ao atualizar perfil: ", "Error updating profile: ") + error.message);
      console.error(error);
    } else {
      toast.success(T("Perfil atualizado com sucesso!", "Profile updated successfully!"));
    }
  };

  if (isSessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">{T('Por favor, faça login para acessar seu perfil.', 'Please log in to access your profile.')}</p>
      </div>
    );
  }

  const currentAvatar = form.watch('avatar_url');
  const getUserInitials = () => {
    const firstName = form.getValues('first_name') || '';
    const lastName = form.getValues('last_name') || '';
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white py-12 rounded-b-3xl">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{T('Meu Perfil', 'My Profile')}</h1>
          <p className="text-gray-300 text-sm md:text-base">
            {T('Gerencie suas informações pessoais e preferências', 'Manage your personal information and preferences')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Pessoais */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="flex items-center text-gray-900 text-lg font-semibold">
                  <User className="h-5 w-5 mr-2 text-gray-700" /> 
                  {T('Informações Pessoais', 'Personal Information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 bg-white">
                {/* Avatar Section - Simplificado */}
                <div>
                  <FormLabel className="text-sm font-semibold text-gray-700 mb-3 block">
                    {T('Foto de Perfil', 'Profile Picture')}
                  </FormLabel>
                  <div className="flex items-start gap-4">
                    {user && (
                      <div className="flex-shrink-0">
                        {currentAvatar || currentAvatarUrl ? (
                          <Avatar className="h-20 w-20 border-2 border-gray-200 shadow-sm">
                            <AvatarImage src={currentAvatar || currentAvatarUrl || ''} alt="Avatar" />
                            <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="h-20 w-20 border-2 border-gray-200 shadow-sm">
                            <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="avatar_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-2">
                                <SupabaseImageUpload
                                  bucket="user_avatars"
                                  pathPrefix={user?.id || ''}
                                  fileName="avatar.png"
                                  label=""
                                  currentUrl={currentAvatarUrl}
                                  onUploadSuccess={(url) => {
                                    field.onChange(url);
                                    setCurrentAvatarUrl(url);
                                  }}
                                />
                                <p className="text-xs text-gray-500">
                                  {T('Máx. 5MB. Formatos: JPG, PNG. Recomendado: Imagem quadrada (ex: 200px).', 'Max. 5MB. Formats: JPG, PNG. Recommended: Square image (e.g.: 200px).')}
                                </p>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Nome e Sobrenome */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          {T('Primeiro Nome', 'First Name')} *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                              placeholder={T("João", "John")} 
                              {...field} 
                              className="pl-10 h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          {T('Sobrenome', 'Last Name')} *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                              placeholder={T("Silva", "Doe")} 
                              {...field} 
                              className="pl-10 h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email (somente leitura) */}
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    {T('E-mail', 'Email')}
                  </FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="pl-10 h-11 bg-gray-50 border-gray-300 text-gray-600"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {T('O e-mail não pode ser alterado.', 'Email cannot be changed.')}
                  </p>
                </FormItem>

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        {T('Telefone', 'Phone')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            placeholder="+258 84 123 4567" 
                            {...field} 
                            className="pl-10 h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Província com Google Maps */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {T('Província', 'Province')}
                        </FormLabel>
                        <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {T('Usar Mapa', 'Use Map')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{T('Selecione sua Localização', 'Select Your Location')}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <LocationPicker
                                onLocationSelect={(province, city) => {
                                  setSelectedProvince(province);
                                  if (city) {
                                    setSelectedCity(city);
                                    form.setValue('city', city);
                                  }
                                  setShowLocationPicker(false);
                                  toast.success(T('Localização selecionada!', 'Location selected!'));
                                }}
                                currentProvince={selectedProvince}
                                currentCity={selectedCity}
                              />
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-800">
                                  {T('💡 Dica: Se o mapa não funcionar, você pode selecionar a província e cidade manualmente nos campos abaixo.', '💡 Tip: If the map does not work, you can select the province and city manually in the fields below.')}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Select 
                        onValueChange={(value) => {
                          setSelectedProvince(value);
                          setSelectedCity('');
                          form.setValue('city', ''); // Reset city when province changes
                        }} 
                        value={selectedProvince || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                            <SelectValue placeholder={T('Selecione sua província', 'Select your province')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mozambiqueProvinces.map((province) => (
                            <SelectItem key={province.name} value={province.name}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cidade */}
                {selectedProvince && availableCities.length > 0 && (
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {T('Cidade', 'City')} {T('(Opcional)', '(Optional)')}
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedCity(value);
                          }} 
                          value={field.value || selectedCity || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                              <SelectValue placeholder={T('Selecione sua cidade', 'Select your city')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Botão Salvar */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black hover:bg-gray-900 text-white font-semibold h-12 rounded-xl shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {T('Salvando...', 'Saving...')}
                </>
              ) : (
                T('Salvar Alterações', 'Save Changes')
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ClientProfilePage;

