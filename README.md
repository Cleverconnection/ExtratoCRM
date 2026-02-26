# Dashboard CRM Financeiro

Projeto React + Vite com login Microsoft (Azure AD) e dashboard financeiro para leitura de extrato CSV.

## Estrutura

```txt
src/
  assets/
  components/
  data/
  hooks/
  pages/
  services/
  utils/
```

## Requisitos

- Node.js 20+
- NPM 10+

## Configuracao

1. Instale dependencias:

```bash
npm install
```

2. Configure o `.env` com dados do app Azure:

```env
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_AZURE_SCOPES=User.Read
VITE_STATEMENT_DB_FILE=data/statement-db.json
VITE_STATEMENT_FILE=Extrato-10-10-2024-a-21-02-2026-CSV.csv
```

3. Banco principal compartilhado (versionado no Git):

- Arquivo principal: `public/data/statement-db.json`
- Ele e a unica fonte de verdade para todos os colaboradores.

4. (Opcional) Coloque o extrato CSV inicial em `public/` com o nome configurado em `VITE_STATEMENT_FILE`.

## Execucao local

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Publicacao no GitHub Pages (gh-pages)

O workflow `.github/workflows/deploy-gh-pages.yml` publica automaticamente na branch `gh-pages` quando houver push em `master` ou `main`.

No repositorio GitHub, configure em `Settings > Pages`:
- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`

Para login Microsoft no ambiente online, configure em `Settings > Secrets and variables > Actions > Variables`:
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID` (ou deixe vazio para `common`)
- `VITE_AZURE_REDIRECT_URI` (se vazio, usa `https://<owner>.github.io/ExtratoCRM/`)
- `VITE_AZURE_SCOPES` (se vazio, usa `User.Read`)

## Atualizar o banco principal com novo extrato

Use este comando sempre que baixar o extrato do mes no banco:

```bash
npm run db:merge -- "caminho/para/Extrato.csv"
```

O comando:
- ignora lancamentos duplicados;
- adiciona apenas diferencas no `public/data/statement-db.json`;
- preserva o historico existente.

Depois disso, faca commit do arquivo `public/data/statement-db.json` para compartilhar com o time.

No localhost (npm run dev): apos importar e revisar pendencias, use o botao `Salvar banco` para gravar automaticamente em `public/data/statement-db.json`.

Fora do localhost, o botao usa fallback para download do arquivo atualizado.

## O que ja esta pronto

- Login com conta Microsoft.
- Leitura de extrato CSV.
- Banco principal em arquivo JSON versionado no Git.
- Merge incremental com deduplicacao via comando `db:merge`.
- Calculo de entradas, saidas, saldo liquido e saldo atual.
- Categorizacao automatica por palavras-chave.
- Categoria `Generica` para lancamentos nao reconhecidos.
