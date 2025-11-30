import { supabase } from '@/integrations/supabase/client';
import { generateBusinessSlug } from '@/utils/slug-generator';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';

/**
 * Garante que o usuário tenha uma conta BUSINESS criando um business placeholder se necessário.
 * Esta função verifica se o usuário já tem um business e, se não tiver, cria um com dados mínimos.
 * 
 * @param userId - ID do usuário
 * @param businessName - Nome do negócio (opcional, se fornecido será usado diretamente, senão usa "Meu Negócio")
 * @returns Promise<string | null> - ID do business criado/existente ou null em caso de erro
 */
export const ensureBusinessAccount = async (
  userId: string,
  businessName?: string
): Promise<string | null> => {
  try {
    // 1. Verificar se usuário já tem um business
    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = No rows found (é esperado se não houver business)
      console.error('❌ Erro ao verificar business existente:', checkError);
      return null;
    }

    // Se já existe business, retornar o ID
    if (existingBusiness?.id) {
      console.log('✅ Business já existe para usuário:', userId);
      return existingBusiness.id;
    }

    // 2. Criar business com nome fornecido ou placeholder
    const finalBusinessName = businessName && businessName.trim() 
      ? businessName.trim() 
      : 'Meu Negócio';

    // Gerar slug único
    let slug = generateBusinessSlug(finalBusinessName);
    let attempts = 0;
    let unique = false;

    // Tentar garantir que o slug seja único
    while (!unique && attempts < 5) {
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);

      if (count === 0) {
        unique = true;
      } else {
        slug = generateBusinessSlug(finalBusinessName);
        attempts++;
      }
    }

    if (!unique) {
      console.error('❌ Não foi possível gerar slug único após 5 tentativas');
      return null;
    }

    // 3. Inserir business com nome fornecido
    const businessData = {
      owner_id: userId,
      name: finalBusinessName,
      slug: slug,
      description: null,
      address: null,
      phone: null,
      logo_url: null,
      cover_photo_url: null,
      working_hours: null,
      theme_color: '#2563eb', // Cor padrão
      instagram_url: null,
      facebook_url: null,
      category: null,
      province: null,
      city: null,
      is_public: true,
    };

    const { data: newBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert(businessData)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Erro ao criar business placeholder:', insertError);
      return null;
    }

    console.log('✅ Business placeholder criado:', newBusiness.id);

    // 4. Atualizar tabela consolidada para refletir o novo role de OWNER
    try {
      await refreshConsolidatedUserData(userId);
      console.log('✅ Tabela consolidada atualizada após criar business');
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
      // Não bloquear se falhar
    }

    return newBusiness.id;
  } catch (error) {
    console.error('❌ Erro inesperado ao garantir business account:', error);
    return null;
  }
};

