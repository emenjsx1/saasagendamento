# 📊 Tabela Consolidada de Usuários

## Visão Geral

Foi criada uma tabela consolidada `user_consolidated` que contém **todas as informações do usuário em um só lugar**, simplificando as consultas e melhorando a performance.

## 🗄️ Estrutura da Tabela

A tabela `user_consolidated` contém:

- **Dados do Profile**: email, first_name, last_name, phone, created_at
- **Dados do Negócio**: business_id, business_name, business_slug
- **Dados da Assinatura**: subscription_id, plan_name, subscription_status, subscription_created_at, trial_ends_at
- **Dados do Pagamento**: payment_id, payment_amount, payment_status, payment_date, payment_method
- **Role**: is_admin, is_owner, role (Admin/Owner/Client)

## 🚀 Como Usar

### 1. Executar a Migration SQL

Execute o arquivo SQL no Supabase:

```bash
# No Supabase Dashboard, vá em SQL Editor e execute:
supabase/migrations/create_user_consolidated_table.sql
```

Ou execute diretamente no SQL Editor do Supabase.

### 2. Popular Dados Existentes

Após criar a tabela, execute esta função para popular com os usuários existentes:

```sql
SELECT populate_user_consolidated();
```

### 3. Uso no Código

O código já está configurado para usar a tabela consolidada automaticamente:

```typescript
import { getConsolidatedUserData, getConsolidatedUsersData } from '@/utils/user-consolidated-data';

// Buscar dados de um usuário
const userData = await getConsolidatedUserData(userId);

// Buscar dados de múltiplos usuários (mais eficiente)
const usersMap = await getConsolidatedUsersData([userId1, userId2, userId3]);
```

## 🔄 Atualização Automática

A tabela é atualizada automaticamente através de **triggers** quando:

- ✅ Um perfil é criado ou atualizado
- ✅ Um negócio é criado, atualizado ou deletado
- ✅ Uma assinatura é criada ou atualizada
- ✅ Um pagamento é criado ou atualizado
- ✅ Um usuário é adicionado/removido como admin

## 📝 Funções Disponíveis

### `update_user_consolidated(user_id UUID)`

Atualiza manualmente os dados consolidados de um usuário específico.

```sql
SELECT update_user_consolidated('user-id-aqui');
```

### `populate_user_consolidated()`

Popula a tabela consolidada com todos os usuários existentes.

```sql
SELECT populate_user_consolidated();
```

## 🎯 Benefícios

1. **Performance**: Uma única query ao invés de múltiplas joins
2. **Simplicidade**: Todos os dados do usuário em um lugar
3. **Manutenibilidade**: Código mais limpo e fácil de entender
4. **Escalabilidade**: Melhor performance com muitos usuários

## ⚠️ Notas Importantes

- A tabela consolidada é atualizada automaticamente via triggers
- Se a tabela não existir, o código usa fallback para buscar das tabelas originais
- A atualização é feita em background, não bloqueia operações
- Os triggers garantem que os dados sempre estejam sincronizados

## 🔍 Verificação

Para verificar se a tabela está funcionando:

```sql
-- Ver todos os dados consolidados
SELECT * FROM user_consolidated;

-- Ver dados de um usuário específico
SELECT * FROM user_consolidated WHERE user_id = 'user-id-aqui';

-- Verificar se os triggers estão funcionando
SELECT * FROM user_consolidated ORDER BY updated_at DESC LIMIT 10;
```


