# musicStreaming-front

Player/organizador de músicas local. **React 19 + Vite + TypeScript**, CSS puro com variáveis.
O layout é inspirado na estrutura do Spotify (barra lateral, área principal, player fixo), sem usar
nada da marca. A cor de destaque é violeta.

## Rodar

```bash
# back-end (outra aba): musicStreaming-api em http://localhost:8080
npm install
npm run dev          # http://localhost:5173  (o Vite repassa /api para :8080)
npm run build        # typecheck + build em dist/
```

- `VITE_API_BASE` muda a URL base da API (padrão `/api`, veja `.env.example`).
- `VITE_PROXY_TARGET` muda o destino do proxy de dev (padrão `http://localhost:8080`).
- No Docker, o `nginx.conf` repassa `/api/` para `backend:8080`.

## Por que CSS puro

Os tokens (cores, espaçamentos, raios, medidas do layout) ficam em `src/styles/theme.css`. Trocar o tema
é só mudar essas variáveis. Não há etapa de build de CSS nem classes utilitárias espalhadas no JSX, o que
deixa os componentes mais fáceis de ler.

## Estrutura

```
src/
  api/          types.ts (espelho dos DTOs) · client.ts (camada única de API)
  state/        AppContext (bibliotecas, árvore, toasts, diálogos, menu)
                PlayerContext (fila, <audio>, volume) · actions.tsx (todas as ações + menus)
  hooks/        useAsync · usePagedSongs · useRoute (rotas por hash) · useMediaQuery
  components/
    layout/     Sidebar · TopBar · BottomNav · ViewHeader
    player/     PlayerBar (+ mini-player) · FullPlayer · ProgressBar
    playlists/  PlaylistTree (árvore, menu, alvo de arrastar) · PlaylistCards
    songs/      SongTable (ordenar, favoritar, menu, arrastar)
    dialogs/    Name · Confirm · MovePlaylist · AddToPlaylist · Tags · Sync · SongDetails · PlaylistPicker
    common/     Icon (SVG próprios) · Cover (capa gerada) · Modal · ContextMenu · Toasts · StateViews
  views/        Home · Playlist · Songs (Favoritas/Todas/Tag/Sem playlist) · Search · Library (aba do celular)
  styles/       theme.css · layout.css · components.css
```

Rotas: `#/`, `#/playlist/:id`, `#/favorites`, `#/all`, `#/unorganized`, `#/tag/:nome`,
`#/search?q=`, `#/library`.

## Rotas da API usadas

Os erros chegam como `{status, error, message, timestamp}`. O front mostra o `message`.

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /api/scan` | — | `ScanResultDTO` |
| `GET /api/libraries` | — | `LibraryDTO[]` |
| `POST /api/libraries` | `{name}` | `LibraryDTO` (201) |
| `GET/PATCH/DELETE /api/libraries/{id}` | PATCH `{name}` | `LibraryDTO` / 204 (padrão → 409) |
| `GET /api/libraries/{id}/tree` | — | `LibraryTreeDTO` (playlists aninhadas + `unorganizedSongs`) |
| `GET/POST /api/libraries/{id}/playlists` | `{name, parentId?}` | `PlaylistSummaryDTO[]` / `PlaylistDTO` |
| `POST /api/libraries/{id}/sync?dryRun=` | — | `SyncResultDTO` |
| `GET/PATCH/DELETE /api/playlists/{id}` | PATCH `{name?, parentId?}` (`null` = raiz) | `PlaylistDTO` / 204 |
| `GET/POST /api/playlists/{id}/songs` | `{songIds}` | `SongDTO[]` |
| `DELETE /api/playlists/{id}/songs/{songId}` | — | 204 |
| `PUT /api/playlists/{id}/songs/order` | `{songIds}` (todas, na nova ordem) | `SongDTO[]` |
| `POST/DELETE /api/playlists/{id}/tags[/{tagId}]` | `{tagId}` ou `{name}` | `PlaylistDTO` / 204 |
| `GET /api/songs?favorite=&tag=&page=&size=` | — | `PageDTO<SongDTO>` |
| `GET /api/songs/{id}` · `GET /api/songs/{id}/stream` | — | `SongDTO` · áudio com Range |
| `PUT/DELETE /api/songs/{id}/favorite` | — | `SongDTO` |
| `POST/DELETE /api/songs/{id}/tags[/{tagId}]` | `{tagId}` ou `{name}` | `SongDTO` / 204 |
| `GET/POST /api/tags` · `DELETE /api/tags/{id}` | `{name}` | `TagDTO[]` / `TagDTO` / 204 |
| `GET /api/search?q=&libraryId=` | — | `{query, songs, playlists}` |

## Limitações conhecidas

- **Editar título/artista/álbum**: no menu da música, aparece com o selo "em breve".
- **Mudar a ordem entre playlists irmãs**: no menu da playlist, aparece com o selo "em breve". Mover leva a
  playlist para o fim do destino.
- **Reordenar músicas com a tabela ordenada por coluna**: "Mover para cima/baixo" fica desabilitado até
  voltar para a ordem da playlist (o `PUT .../order` precisa da ordem real).
- **Fila "tocar a seguir", aleatório e histórico**: funcionam só no front e não ficam salvos.

## Comportamento

- **Busca**: a API já entrega ordenado (nome primeiro, tag depois). Mesmo assim, o front separa no
  mesmo critério e marca os resultados que vieram só pela tag.
- **Escopo da busca**: as playlists são filtradas pela biblioteca atual (`libraryId`). As músicas são
  globais, como no back-end.
- **Sincronizar**: primeiro roda um `dryRun` para mostrar o plano. Só executa depois da confirmação, e então
  mostra o resultado (inclusive se parou no meio).
- **Celular**: um toque toca a música. No desktop é duplo clique ou o botão ▶ da linha. Clique direito ou
  "⋯" abre o menu.
- **Arrastar música para playlist**: arrastar uma linha da tabela até a árvore da barra lateral (só desktop).
- **Lembrado no navegador**: a biblioteca escolhida e o volume ficam no `localStorage`.
