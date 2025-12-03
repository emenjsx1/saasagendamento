# 🔍 Como Verificar Onde Estão os Agendamentos Pendentes

## ⚠️ Problema Reportado

Na interface, mostra "2 PENDENTES" no resumo, mas no "Fluxo diário" com filtro "Pendente" selecionado, aparece "Nenhum horário restante para hoje."

## ✅ Correções Implementadas

### 1. Filtro Corrigido
- Agendamentos pendentes agora **SEMPRE aparecem**, mesmo que o horário já tenha passado
- Código atualizado em `src/pages/AppointmentsPage.tsx`

### 2. Logs de Debug Adicionados
- Logs no console para rastrear o que está acontecendo
- Ajuda a identificar por que agendamentos não aparecem

## 🔍 Como Verificar

### Passo 1: Abrir o Console do Navegador

1. Pressione **F12** ou **Ctrl+Shift+I**
2. Vá para a aba **Console**
3. Recarregue a página de agendamentos

### Passo 2: Verificar os Logs

Procure por estas mensagens no console:

```
🔍 Filtrando agendamentos: { total: X, filterDate: ..., isToday: true/false }
✅ Pendente mantido: [Nome do Cliente] [Horário]
✅ Agendamentos após filtro: X de Y
🕐 Criando hourlySchedule com X agendamentos filtrados
📅 Agendamento: { id: ..., client: ..., status: 'pending', ... }
✅ hourlySchedule criado com X horários
```

### Passo 3: Verificar o Que os Logs Mostram

**Se os logs mostram:**
- `total: 2` mas `após filtro: 0` → Os agendamentos estão sendo filtrados incorretamente
- `total: 0` → Os agendamentos não estão sendo buscados do banco
- `após filtro: 2` mas `hourlySchedule: 0` → Problema no agrupamento por hora

## 🛠️ Possíveis Causas

### Causa 1: Agendamentos Não Estão no Banco
**Verificar:**
1. Abra o Supabase Dashboard
2. Vá para **Table Editor** → **appointments**
3. Filtre por `status = 'pending'` e `start_time` = data de hoje
4. Verifique se existem 2 agendamentos

### Causa 2: Filtro de Data Incorreto
**Verificar:**
- A data selecionada no filtro corresponde à data dos agendamentos?
- Os agendamentos são de hoje ou de outro dia?

### Causa 3: Filtro de Funcionário
**Verificar:**
- Se há filtro de funcionário ativo, pode estar escondendo os agendamentos
- Tente selecionar "Todos os funcionários"

### Causa 4: Cache do Navegador
**Solução:**
1. Pressione **Ctrl+Shift+R** (recarregar forçado)
2. Ou limpe o cache do navegador

## 📋 Checklist de Verificação

- [ ] Console mostra agendamentos sendo buscados do banco?
- [ ] Console mostra agendamentos passando pelo filtro?
- [ ] Console mostra agendamentos sendo agrupados por hora?
- [ ] Data selecionada corresponde à data dos agendamentos?
- [ ] Filtro de funcionário está em "Todos"?
- [ ] Filtro de status está em "Pendente"?
- [ ] Agendamentos existem no banco de dados?

## 🔧 Solução Rápida

Se os agendamentos existem no banco mas não aparecem:

1. **Recarregue a página** (Ctrl+Shift+R)
2. **Verifique os filtros:**
   - Data: Deve ser a data dos agendamentos
   - Status: "Pendente" ou "Todos"
   - Funcionário: "Todos os funcionários"
3. **Verifique o console** para ver os logs
4. **Se ainda não aparecer**, verifique no banco se os agendamentos têm:
   - `status = 'pending'`
   - `start_time` na data correta
   - `business_id` correto

## 📊 O Que Esperar

Após a correção, você deve ver:

1. **No resumo:** "2 PENDENTES"
2. **No Fluxo diário (filtro Pendente):** Os 2 agendamentos listados, mesmo que o horário já tenha passado
3. **No console:** Logs mostrando os agendamentos sendo processados

## 🆘 Se Ainda Não Aparecer

1. Verifique os logs do console
2. Verifique no banco de dados se os agendamentos existem
3. Verifique se a data selecionada está correta
4. Tente limpar o cache e recarregar
5. Verifique se há erros no console (vermelho)

## 📝 Nota Importante

A correção foi implementada para que agendamentos pendentes **SEMPRE** apareçam, independente do horário. Se ainda não aparecem, pode ser:

- Cache do navegador (recarregue forçado)
- Agendamentos não estão no banco
- Filtros incorretos aplicados
- Erro na busca do banco (verifique console)

