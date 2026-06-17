# Checklist LGPD — Verificações por Categoria

Use este checklist durante a análise do projeto. Para cada item, determine: ✅ Conforme | ❌ Não conforme | ⚠️ Parcial | 🔍 Não encontrado/Não avaliado

---

## CAT-1: Bases Legais e Consentimento (Art. 7, 8, 9, 10)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 1.1 | Existe uma base legal definida para cada operação de tratamento de dados | CRÍTICO | Art. 7 |
| 1.2 | Quando a base é consentimento, ele é coletado de forma **explícita** (opt-in ativo) | CRÍTICO | Art. 8 |
| 1.3 | O consentimento é **específico por finalidade** (não genérico/agrupado) | ALTO | Art. 8, §4 |
| 1.4 | A **finalidade** do tratamento é informada ao usuário no momento da coleta | ALTO | Art. 9 |
| 1.5 | Existe mecanismo para o usuário **revogar o consentimento** a qualquer momento | ALTO | Art. 8, §5 |
| 1.6 | A **data, hora e versão** do consentimento são registradas com o dado | MÉDIO | Art. 8, §2 |
| 1.7 | O consentimento de **menores de 16 anos** exige confirmação dos pais/responsáveis | CRÍTICO | Art. 14 |
| 1.8 | Não há pré-marcação de checkboxes de consentimento | ALTO | Art. 8 |
| 1.9 | O controlador (empresa) está identificado nos formulários de coleta | MÉDIO | Art. 9 |

---

## CAT-2: Minimização de Dados (Art. 6, III)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 2.1 | Somente dados estritamente necessários para a finalidade são coletados | ALTO | Art. 6, III |
| 2.2 | Campos opcionais estão claramente marcados como opcionais nos formulários | MÉDIO | Art. 6, III |
| 2.3 | Não há campos coletados mas nunca utilizados na lógica de negócio | MÉDIO | Art. 6, III |
| 2.4 | A coleta de dados pessoais em APIs é proporcional ao objetivo do endpoint | MÉDIO | Art. 6, III |
| 2.5 | Campos sensíveis (CPF, RG, etc.) são solicitados apenas quando realmente necessários | ALTO | Art. 6, III |

---

## CAT-3: Dados Pessoais Sensíveis (Art. 5, II; Art. 11)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 3.1 | Dados sensíveis são identificados e explicitamente marcados no sistema | ALTO | Art. 5, II |
| 3.2 | O consentimento para dados sensíveis é **específico e destacado** (separado do geral) | CRÍTICO | Art. 11, I |
| 3.3 | Dados biométricos (foto de rosto, digital) têm tratamento especial de segurança | CRÍTICO | Art. 11 |
| 3.4 | Dados de saúde só são tratados quando há base legal específica | CRÍTICO | Art. 11 |
| 3.5 | Não há tratamento de dados sensíveis para fins de discriminação | CRÍTICO | Art. 11, §1 |
| 3.6 | O acesso a dados sensíveis é mais restrito que dados pessoais comuns | ALTO | Art. 46 |

---

## CAT-4: Segurança Técnica (Art. 46, 47, 48)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 4.1 | Todas as conexões usam **HTTPS/TLS** (nenhum endpoint HTTP em produção) | CRÍTICO | Art. 46 |
| 4.2 | Senhas são hasheadas com algoritmo seguro (**bcrypt, argon2, scrypt**) — não MD5/SHA1 | CRÍTICO | Art. 46 |
| 4.3 | Credenciais (API keys, senhas de BD) estão em **variáveis de ambiente** e não no código | CRÍTICO | Art. 46 |
| 4.4 | Campos sensíveis no banco de dados são **criptografados em repouso** | ALTO | Art. 46 |
| 4.5 | Tokens JWT possuem **expiração** definida e assinatura verificada | ALTO | Art. 46 |
| 4.6 | Queries SQL usam **parâmetros preparados** (não concatenação de strings) | CRÍTICO | Art. 46 |
| 4.7 | Existe **rate limiting** em endpoints de autenticação | ALTO | Art. 46 |
| 4.8 | Headers de segurança HTTP estão configurados (CORS, CSP, HSTS, X-Frame-Options) | MÉDIO | Art. 46 |
| 4.9 | Não há dados pessoais expostos em URLs (ex: `/user/email@domain.com`) | ALTO | Art. 46 |
| 4.10 | Dados pessoais não aparecem em respostas de erro/stack traces | ALTO | Art. 46 |
| 4.11 | Existe política de atualização de dependências com vulnerabilidades conhecidas | MÉDIO | Art. 46 |
| 4.12 | Dados pessoais em cache são tratados com as mesmas proteções | MÉDIO | Art. 46 |

---

## CAT-5: Logs e Auditoria (Art. 37)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 5.1 | O sistema possui logs de acesso e modificação de dados pessoais | ALTO | Art. 37 |
| 5.2 | Logs registram **quem** acessou, **quando** e **quais dados** | ALTO | Art. 37 |
| 5.3 | Logs **NÃO** contêm dados sensíveis em texto claro (senha, CPF, cartão) | CRÍTICO | Art. 46 |
| 5.4 | Logs têm política de retenção definida | MÉDIO | Art. 37 |
| 5.5 | Logs são protegidos contra alteração/exclusão não autorizada | MÉDIO | Art. 37 |
| 5.6 | Existe rastreabilidade de operações de exclusão de dados | ALTO | Art. 37 |

---

## CAT-6: Direitos dos Titulares (Art. 18)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 6.1 | Existe funcionalidade para o titular **acessar todos os seus dados** | ALTO | Art. 18, II |
| 6.2 | Existe funcionalidade para o titular **corrigir** seus dados | ALTO | Art. 18, III |
| 6.3 | Existe funcionalidade para o titular **excluir** sua conta e dados | CRÍTICO | Art. 18, VI |
| 6.4 | Existe funcionalidade de **portabilidade** (exportar dados em JSON/CSV) | MÉDIO | Art. 18, V |
| 6.5 | Existe funcionalidade para o titular **revogar consentimento** | ALTO | Art. 18, IX |
| 6.6 | Existe canal de atendimento para solicitações de titulares (email/formulário) | ALTO | Art. 18, §1 |
| 6.7 | Solicitações de titulares são respondidas em prazo definido (máx. 15 dias úteis) | MÉDIO | Art. 18, §3 |
| 6.8 | A exclusão remove dados de **todos os sistemas** (backups, logs, serviços terceiros) | ALTO | Art. 16 |

---

## CAT-7: Retenção e Eliminação de Dados (Art. 15, 16)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 7.1 | Existe política de retenção de dados **documentada** (quanto tempo cada tipo de dado é mantido) | ALTO | Art. 15 |
| 7.2 | Existe **processo automatizado** de eliminação de dados após o prazo de retenção | ALTO | Art. 16 |
| 7.3 | Dados de usuários que excluíram a conta são eliminados no prazo correto | CRÍTICO | Art. 16 |
| 7.4 | Backups têm política de retenção alinhada com a política de dados | MÉDIO | Art. 16 |
| 7.5 | Dados de logs são eliminados após o prazo de retenção | MÉDIO | Art. 16 |
| 7.6 | Dados de testes/desenvolvimento não usam dados pessoais reais | ALTO | Art. 46 |

---

## CAT-8: Privacy by Design (Art. 46, §2)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 8.1 | Dados pessoais são **anonimizados ou pseudonimizados** quando possível | MÉDIO | Art. 46, §2 |
| 8.2 | Configurações de privacidade têm o **modo mais restritivo** como padrão | MÉDIO | Art. 46, §2 |
| 8.3 | Dados pessoais não aparecem em URLs publicamente acessíveis | ALTO | Art. 46 |
| 8.4 | Analytics e telemetria não transmitem dados pessoais identificáveis | ALTO | Art. 46 |
| 8.5 | IDs internos usam UUIDs ou IDs opacos (não IDs sequenciais expostos) | BAIXO | Art. 46 |
| 8.6 | Campos de busca não permitem enumeração de usuários | MÉDIO | Art. 46 |

---

## CAT-9: Transferência Internacional (Art. 33–36)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 9.1 | Está mapeado **quais dados** são enviados para serviços externos e para quais países | ALTO | Art. 33 |
| 9.2 | Serviços externos processando dados de brasileiros têm **nível de proteção adequado** ou salvaguardas | ALTO | Art. 33 |
| 9.3 | Existe cláusula de proteção de dados nos contratos com fornecedores externos | MÉDIO | Art. 36 |
| 9.4 | Cloud providers têm opção de manter dados no Brasil ou em países adequados | MÉDIO | Art. 33 |
| 9.5 | O titular é informado sobre a transferência internacional de seus dados | MÉDIO | Art. 33 |

---

## CAT-10: Documentação e Governança (Art. 37, 38, 41)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 10.1 | Existe **Política de Privacidade** pública e atualizada | ALTO | Art. 9 |
| 10.2 | A Política de Privacidade está acessível antes da coleta de dados | ALTO | Art. 9 |
| 10.3 | Existe **Registro de Atividades de Tratamento (RAT/ROPA)** documentado | ALTO | Art. 37 |
| 10.4 | Existe **DPO/Encarregado de Dados** designado com contato público | ALTO | Art. 41 |
| 10.5 | RIPD foi elaborado para operações de alto risco | MÉDIO | Art. 38 |
| 10.6 | Contratos com operadores (subprocessadores) incluem cláusulas de proteção de dados | ALTO | Art. 36 |
| 10.7 | Existe treinamento/documentação de LGPD para a equipe de desenvolvimento | BAIXO | Art. 50 |

---

## CAT-11: Notificação de Incidentes (Art. 48)

| # | Verificação | Severidade | Artigo |
|---|---|---|---|
| 11.1 | Existe **processo documentado** de resposta a incidentes de segurança | ALTO | Art. 48 |
| 11.2 | Existe **monitoramento** de acesso não autorizado ou vazamentos | ALTO | Art. 48 |
| 11.3 | Existe **canal de comunicação** para report de incidentes | MÉDIO | Art. 48 |
| 11.4 | O processo define o prazo de notificação à ANPD (máx. 72h recomendado) | ALTO | Art. 48 |
| 11.5 | O processo define como notificar os titulares afetados | ALTO | Art. 48 |
