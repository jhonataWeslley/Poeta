# Poeta

Sistema pessoal de organização: notas, ideias, tarefas, planos e progresso.
HTML, CSS e JavaScript puro, com dados no `localStorage`. Básico bem feito.

## Como usar
Abra `index.html` no navegador (ou use o link do GitHub Pages).

## Estrutura
- `index.html`: estrutura da página
- `style.css`: identidade visual e responsividade
- `script.js`: lógica (camada `Storage` isolada, `Repo` para dados, `Views` para telas)

## Backup
Os dados ficam só no navegador. Em Configurações, use Exportar dados para gerar um `.json`
e Importar dados para restaurar.

## Evolução futura
Para trocar o LocalStorage por API/banco, altere apenas o objeto `Storage` em `script.js`.

## Publicar no GitHub Pages
1. Suba a pasta no GitHub (`git init`, `git add .`, `git commit`, `git push`).
2. No repositório: Settings, Pages, Source: branch `main`, pasta `/ (root)`.
