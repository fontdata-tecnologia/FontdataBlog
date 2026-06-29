# Bug: Scheduled Jobs do Coolify falham com "sh: curl: not found"

**Data**: 2026-06-29
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema
Após migrar o deploy para o Coolify e configurar os Scheduled Jobs (Source Crawlers,
Automation, RSS, Data Retention), toda execução falhava imediatamente no painel do
Coolify com a mensagem:

```
Job permanently failed after 1 attempts: sh: curl: not found
```

As 100 execuções listadas na aba "Failures" tinham duração de 0–1s e o mesmo erro,
indicando que o comando nem chegava a sair do shell.

## Causa-raiz
**Arquivo**: `Dockerfile`
**Linha**: estágio `runner` (FROM node:20-alpine AS runner)
**Tipo**: infraestrutura / imagem Docker

Os Scheduled Jobs do Coolify executam o comando configurado **dentro do container**
da aplicação. Os jobs foram configurados para chamar os endpoints de cron via `curl`
(`curl -X POST .../api/cron/...`). Porém a imagem de runtime é `node:20-alpine` com a
saída standalone do Next.js, e o Alpine **não inclui o `curl`** por padrão — traz apenas
o `wget` embutido no BusyBox. Como o binário `curl` não existia no PATH, o shell `sh`
retornava `curl: not found` antes de qualquer requisição ser feita.

## Solução aplicada
Adicionada a instalação do `curl` no estágio de runtime do Dockerfile, antes da troca
de usuário para `nextjs`:

```dockerfile
RUN apk add --no-cache curl
```

Assim os comandos `curl` já configurados no painel do Coolify continuam funcionando sem
necessidade de alteração. Após o próximo build/deploy da imagem, os jobs passam a executar.

**Arquivos modificados**:
- `Dockerfile` — adiciona `RUN apk add --no-cache curl` no estágio `runner`

## Como reproduzir (antes da correção)
1. Fazer deploy da imagem `node:20-alpine` no Coolify
2. Configurar um Scheduled Job com comando `curl -X POST http://localhost:3000/api/cron/...`
3. Executar o job → resultado real: `sh: curl: not found` (esperado: requisição HTTP ao endpoint)

## Como verificar (após a correção)
- [ ] Rebuild da imagem Docker (push para `master` dispara o build no GHCR + deploy via webhook)
- [ ] Executar manualmente um Scheduled Job no Coolify → não retorna mais `curl: not found`
- [ ] Conferir `automation_logs` registrando a execução do cron
- [ ] `docker run --rm <imagem> curl --version` retorna a versão do curl

## Lições aprendidas
Imagens `*-alpine` são mínimas e **não trazem `curl`** — apenas o `wget` do BusyBox.
Quando uma plataforma (Coolify, cron de container, healthcheck) executa comandos dentro
do container, qualquer binário usado precisa estar presente na imagem de runtime. Alternativa
sem alterar a imagem: usar `wget -q -O- --post-data=''` no comando do job, mas instalar
`curl` é mais portável e menos sujeito a diferenças de flags do BusyBox.
