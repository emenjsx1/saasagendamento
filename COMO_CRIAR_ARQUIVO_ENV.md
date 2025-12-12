# 📝 Como Criar o Arquivo .env

## ⚠️ IMPORTANTE: Crie o arquivo `.env` na raiz do projeto

O arquivo `.env` é onde você coloca suas chaves secretas. Ele **NÃO** deve ser commitado no Git (já está no .gitignore).

## 📋 Passo a Passo

### 1. Localizar a Raiz do Projeto

A raiz do projeto é a pasta onde está o arquivo `package.json`. 

Exemplo:
```
C:\Users\PRECISION\Downloads\PASTA AGOSTIO-DEZEMBRO\AGENCODES\
```

### 2. Criar o Arquivo .env

**Opção A: Via Editor de Código (Recomendado)**

1. Abra o projeto no VS Code ou seu editor
2. Clique com botão direito na raiz do projeto (mesma pasta do `package.json`)
3. Selecione **"New File"** ou **"Novo Arquivo"**
4. Digite o nome: `.env` (com o ponto no início!)
5. Pressione Enter

**Opção B: Via Windows Explorer**

1. Abra o Windows Explorer
2. Navegue até a pasta do projeto
3. Clique com botão direito → **Novo** → **Documento de Texto**
4. Renomeie para `.env` (incluindo o ponto no início)
5. Windows pode avisar sobre mudar a extensão - clique em **Sim**

**Opção C: Via PowerShell**

1. Abra o PowerShell na pasta do projeto
2. Execute:
```powershell
New-Item -Path .env -ItemType File
```

### 3. Adicionar o Conteúdo

Abra o arquivo `.env` e adicione:

```env
VITE_DODO_API_KEY=4RAOYsDjTqdywX8O.BHI-m4Sss5iPnX_zrwPAW6N1BCvA3SUPOujjR7FuOOcbaRHl
```

### 4. Salvar

Salve o arquivo (Ctrl+S)

### 5. Reiniciar o Servidor

Se você estiver rodando o servidor de desenvolvimento:

1. Pare o servidor (Ctrl+C no terminal)
2. Execute novamente: `npm run dev`

---

## ✅ Verificar se Funcionou

Após criar o arquivo e reiniciar o servidor, o sistema deve conseguir ler a API key automaticamente.

Se ainda houver erro, verifique:
- O arquivo está na raiz do projeto (mesma pasta do `package.json`)?
- O nome está correto: `.env` (com ponto no início)?
- O conteúdo está correto (sem espaços extras)?
- Você reiniciou o servidor?


