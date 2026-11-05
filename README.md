# musicStreaming

Servidor de música local com player web. Você aponta o app para uma pasta do seu computador, ele
escaneia as músicas, transforma cada subpasta em uma playlist e deixa você reorganizar tudo pela
interface: playlists aninhadas, tags, favoritos, busca e várias bibliotecas. Quando quiser, um
**sync** reorganiza a pasta real no disco para ficar igual à biblioteca.

```
musicStreaming/
├── musicStreaming-api/     back-end: Spring Boot 4 · Java 17 · H2 · JPA
├── musicStreaming-front/   front-end: React 19 · Vite · TypeScript · nginx
├── compose.yaml            sobe os dois com Docker
└── .env.example            configuração do compose
```

## Funcionalidades

- **Scan automático** da pasta de músicas (`.mp3 .flac .ogg .m4a .wav`), com leitura de metadados
  (título, artista, álbum, duração). O scan roda na inicialização e pode ser disparado pela interface.
- **Biblioteca padrão** criada no primeiro scan: subpastas viram playlists, sub-subpastas viram
  sub-playlists. Scans seguintes são incrementais e nunca desfazem as suas edições.
- **Bibliotecas extras** para organizar as mesmas músicas de outro jeito.
- **Playlists aninhadas**: criar, renomear, mover, excluir, reordenar músicas, arrastar músicas para
  playlists.
- **Tags e favoritos** em músicas e playlists.
- **Busca** sem diferenciar maiúsculas nem acentos, por título/artista/álbum, nome de playlist e tags.
- **Streaming** com suporte a `Range` (dá para avançar e voltar na música).
- **Sync** da biblioteca para o disco, com prévia (`dryRun`) antes de aplicar. Arquivos de música
  nunca são apagados: são movidos, ou copiados quando a música está em mais de uma playlist.
- Interface responsiva (desktop e celular), com fila, player fixo e player em tela cheia.

## Como funciona

| Disco (fonte da verdade física) | Banco H2 (fonte da verdade lógica) |
|---|---|
| arquivos de música | IDs e metadados das músicas |
| pastas | bibliotecas e playlists |
| | tags, favoritos, configurações |

Tudo o que você faz na interface altera só o banco. O disco só muda quando você roda o **sync**.
Uma mesma música em vários lugares do disco é reconhecida como uma única música (identificada pelo
hash do conteúdo).

## Rodando com Docker (recomendado)

Pré-requisitos: Docker com o plugin Compose.

```bash
cp .env.example .env
# edite o .env: FOLDER_ROOT, UID e GID
docker compose up -d --build
```

Abra **http://localhost:5173**.

Variáveis do `.env`:

| Variável | Padrão | Descrição |
|---|---|---|
| `FOLDER_ROOT` | — (obrigatória) | Pasta do computador com as músicas. Precisa existir. |
| `UID` / `GID` | `1000` | Usuário/grupo com que o back-end mexe nos arquivos (`id -u`, `id -g`). Assim o sync cria arquivos com o dono certo. |
| `FRONT_PORT` | `5173` | Porta da interface web. |
| `API_PORT` | `8080` | Porta da API, exposta só em `127.0.0.1` para depuração. |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=75` | Opções da JVM. |

No Docker, o nginx do front-end serve a interface e repassa `/api/` para o back-end, então o navegador
fala com uma origem só. O banco fica no volume `music-data` e sobrevive a reinícios e rebuilds.

```bash
docker compose logs -f backend   # acompanhar o back-end
docker compose down              # parar (mantém o banco)
docker compose down -v           # parar e apagar o banco (as músicas não são tocadas)
```

## Rodando em modo de desenvolvimento

Pré-requisitos: Java 17 e Node 22.

**Back-end** (http://localhost:8080):

```bash
cd musicStreaming-api
MUSIC_ROOT=$HOME/Músicas MUSIC_DATA=./data ./mvnw spring-boot:run
```

**Front-end** (http://localhost:5173, o Vite repassa `/api` para `:8080`):

```bash
cd musicStreaming-front
npm install
npm run dev
```

Detalhes do front-end (estrutura, rotas, decisões) estão em
[`musicStreaming-front/README.md`](musicStreaming-front/README.md).

### Configuração do back-end

Em `musicStreaming-api/src/main/resources/application.properties`:

| Propriedade | Padrão | Descrição |
|---|---|---|
| `music.root` | `${MUSIC_ROOT:/app/streaming}` | Pasta raiz das músicas. |
| `spring.datasource.url` | `jdbc:h2:file:${MUSIC_DATA:/app/data}/musicdb` | Banco H2 em arquivo. |
| `music.scan-on-startup` | `true` | Escaneia a pasta ao iniciar. |
| `music.cors-origins` | `http://localhost:5173` | Origens liberadas no CORS. |

## Testes e build

```bash
# back-end: testes de integração (scan, sync, bibliotecas, playlists, busca, streaming)
cd musicStreaming-api && ./mvnw test

# front-end: typecheck, lint e build
cd musicStreaming-front && npm run typecheck && npm run lint && npm run build
```

## API

Todas as rotas ficam sob `/api`. Erros voltam como JSON
`{status, error, message, timestamp}` (404 não encontrado, 400 validação, 409 conflito).

| Recurso | Rotas |
|---|---|
| Scan | `POST /scan` |
| Bibliotecas | `GET/POST /libraries` · `GET/PATCH/DELETE /libraries/{id}` · `GET /libraries/{id}/tree` · `GET/POST /libraries/{id}/playlists` · `POST /libraries/{id}/sync?dryRun=` |
| Playlists | `GET/PATCH/DELETE /playlists/{id}` · `GET/POST /playlists/{id}/songs` · `DELETE /playlists/{id}/songs/{songId}` · `PUT /playlists/{id}/songs/order` · `POST /playlists/{id}/tags` · `DELETE /playlists/{id}/tags/{tagId}` |
| Músicas | `GET /songs?favorite=&tag=&page=&size=` · `GET /songs/{id}` · `GET /songs/{id}/stream` · `PUT/DELETE /songs/{id}/favorite` · `POST /songs/{id}/tags` · `DELETE /songs/{id}/tags/{tagId}` |
| Tags | `GET/POST /tags` · `DELETE /tags/{id}` |
| Configurações | `GET /settings` |
| Pastas (somente leitura) | `GET /folders` · `GET /folders/{id}` · `GET /folders/{id}/tree` |
| Busca | `GET /search?q=&libraryId=` |
| Saúde | `GET /actuator/health` · `GET /actuator/info` |

Exemplos:

```bash
curl -X POST localhost:8080/api/scan
curl localhost:8080/api/libraries
curl "localhost:8080/api/search?q=beatles"
curl -X POST "localhost:8080/api/libraries/1/sync?dryRun=true"   # mostra o plano sem mexer no disco
```

## Sync: o que acontece no disco

Ao sincronizar uma biblioteca:

1. Cada playlist raiz vira uma pasta na raiz e cada sub-playlist vira uma subpasta (nomes sanitizados;
   conflitos ganham o sufixo ` (2)`).
2. Uma música em uma playlist é movida para a pasta dela.
3. Uma música em várias playlists fica em uma e é copiada para as outras (hardlink quando possível).
4. Músicas sem playlist vão para a raiz.
5. Pastas que ficaram vazias podem ser removidas. **Nenhum arquivo de música é apagado.**
6. No fim, um scan incremental atualiza o banco.

Use `dryRun=true` (ou a prévia na interface) para ver as operações antes de aplicar. Se der erro no
meio, a resposta informa o que já foi aplicado.
