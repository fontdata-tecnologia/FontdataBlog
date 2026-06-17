// ExpxIcons.tsx — Biblioteca central de ícones SVG originais do Expx
// Todos os ícones seguem: viewBox="0 0 24 24", fill="none", stroke="currentColor",
// strokeWidth="1.75", strokeLinecap="round", strokeLinejoin="round", outline-only.

import type { CSSProperties } from 'react'

type IconProps = {
  size?: number
  className?: string
  style?: CSSProperties
}

// ──────────────────────────────────────────────
// NAVEGAÇÃO PRINCIPAL
// ──────────────────────────────────────────────

/** Dashboard: grade de quatro blocos com detalhe de barra interna */
export function IconDashboard({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <line x1="5" y1="7" x2="9" y2="7" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
      <line x1="15" y1="17" x2="19" y2="17" />
    </svg>
  )
}

/** Analytics: três barras verticais de alturas diferentes + linha de tendência curva */
export function IconAnalytics({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="10" width="4" height="10" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="17" rx="1" />
      <path d="M3 8 Q7 4 12 5 Q17 6 21 2" />
    </svg>
  )
}

/** Artigos: folha dobrada com parágrafo e marcador lateral */
export function IconArtigos({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
      <circle cx="6" cy="13" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Newsletter: envelope com sinal de rádio / onda saindo */
export function IconNewsletter({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="2" y="6" width="16" height="12" rx="2" />
      <polyline points="2,6 10,13 18,6" />
      <path d="M19 9 Q22 12 19 15" />
      <path d="M20.5 7 Q24 12 20.5 17" strokeWidth="1.25" />
    </svg>
  )
}

/** API: terminais de código com chaves e divisor */
export function IconAPI({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="7,8 3,12 7,16" />
      <polyline points="17,8 21,12 17,16" />
      <line x1="14" y1="5" x2="10" y2="19" />
    </svg>
  )
}

/** Aparência: círculo com onda interna e dois pontos cardinais */
export function IconAparencia({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12 Q10 8 12 12 Q14 16 16 12" />
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21" />
    </svg>
  )
}

/** Configurações: hexágono com ponto central */
export function IconConfiguracoes({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,2 19.5,6.5 19.5,15.5 12,20 4.5,15.5 4.5,6.5" />
      <circle cx="12" cy="11" r="2.5" />
      <line x1="12" y1="2" x2="12" y2="5.5" />
      <line x1="12" y1="16.5" x2="12" y2="20" />
    </svg>
  )
}

// ──────────────────────────────────────────────
// RODAPÉ SIDEBAR
// ──────────────────────────────────────────────

/** Avatar/Usuário: silhueta de pessoa */
export function IconAvatar({ size = 13, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </svg>
  )
}

/** Logout: porta com seta apontando para fora */
export function IconLogout({ size = 15, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ──────────────────────────────────────────────
// SUB-MENU CONFIGURAÇÕES
// ──────────────────────────────────────────────

/** Blog/Geral: retângulo de post com linhas de conteúdo */
export function IconBlog({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="14" y2="13" />
      <line x1="7" y1="17" x2="11" y2="17" />
    </svg>
  )
}

/** Empresa: prédio comercial com janelas */
export function IconEmpresa({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="4" y="4" width="16" height="17" rx="1" />
      <rect x="8" y="8" width="3" height="3" rx="0.5" />
      <rect x="13" y="8" width="3" height="3" rx="0.5" />
      <rect x="8" y="14" width="3" height="3" rx="0.5" />
      <rect x="13" y="14" width="3" height="3" rx="0.5" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  )
}

/** Redes Sociais / Site: globo com dois meridianos e equador */
export function IconRedes({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 Q16 8 16 12 Q16 16 12 21" />
      <path d="M12 3 Q8 8 8 12 Q8 16 12 21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
}

/** IA / OpenRouter: nó central com raios */
export function IconIA({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="2" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="14.83" y2="9.17" />
      <line x1="9.17" y1="14.83" x2="4.93" y2="19.07" />
    </svg>
  )
}

/** Logs de IA: folha com relógio embutido */
export function IconAILogs({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
      <circle cx="14" cy="15" r="3" />
      <polyline points="14,13 14,15 15.5,15" />
    </svg>
  )
}

/** Firecrawl: chama estilizada em dois traços curvos */
export function IconFirecrawl({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2 Q16 6 15 11 Q18 8 17 13 Q19 11 18 16 Q17 21 12 22 Q7 21 6 16 Q5 11 8 13 Q7 8 10 11 Q9 6 12 2Z" />
    </svg>
  )
}

/** Pexels / Imagem: moldura fotográfica com montanha e sol */
export function IconImagem({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <polyline points="3,17 8,12 12,15 16,11 21,17" />
    </svg>
  )
}

/** API Keys / Chaves: chave diagonal */
export function IconChaves({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="8" cy="15" r="4" />
      <line x1="11.5" y1="11.5" x2="21" y2="3" />
      <line x1="20" y1="7" x2="22" y2="5" />
      <line x1="17" y1="10" x2="19" y2="8" />
    </svg>
  )
}

/** Telegram / Bot: avião de papel com trajetória */
export function IconTelegram({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M21 3 L2 10 L10 13 L13 21 Z" />
      <line x1="10" y1="13" x2="21" y2="3" />
    </svg>
  )
}

/** Vercel / Deploy: triângulo com sinal de mais interno */
export function IconVercel({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,3 22,21 2,21" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}

/** Banco de Dados: cilindro de banco com camadas */
export function IconBancoDados({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6 L4 18" />
      <path d="M20 6 L20 18" />
      <ellipse cx="12" cy="18" rx="8" ry="3" />
      <path d="M4 12 Q8 14 12 14 Q16 14 20 12" />
    </svg>
  )
}

// ──────────────────────────────────────────────
// SUB-MENU ARTIGOS
// ──────────────────────────────────────────────

/** Lista de Artigos: pilha de documentos */
export function IconListaArtigos({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  )
}

/** Temas: lâmpada de ideia com raios */
export function IconTemas({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M9 21 h6" />
      <path d="M12 18 v-3" />
      <path d="M8 18 h8" />
      <path d="M9 15 Q7 13 7 10 A5 5 0 0 1 17 10 Q17 13 15 15 Z" />
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="4.22" y1="5.22" x2="5.64" y2="6.64" />
      <line x1="19.78" y1="5.22" x2="18.36" y2="6.64" />
    </svg>
  )
}

/** Briefing: prancheta com linhas */
export function IconBriefing({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="5" y="5" width="14" height="16" rx="1.5" />
      <path d="M9 5 v-2 h6 v2" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  )
}

/** Automação: seta circular de ciclo com centro */
export function IconAutomacao({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2 A10 10 0 1 1 2 12" />
      <polyline points="2,7 2,12 7,12" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

/** RSS: símbolo de sinal com círculo */
export function IconRSS({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="6" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <path d="M4 14 Q9 14 9 19" />
      <path d="M4 9 Q14 9 14 19" />
      <path d="M4 4 Q20 4 20 19" />
    </svg>
  )
}

/** Fontes de Conteúdo: lupa com onda interna */
export function IconFontes({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="10" cy="10" r="7" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
      <path d="M7 10 Q9 7 13 10" />
    </svg>
  )
}

/** Agentes de IA: rede neural com três nós */
export function IconAgentes({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="19" cy="17" r="2" />
      <line x1="12" y1="7" x2="5" y2="15" />
      <line x1="12" y1="7" x2="19" y2="15" />
      <line x1="7" y1="17" x2="17" y2="17" />
    </svg>
  )
}

/** Categorias: pasta com hierarquia */
export function IconCategorias({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M3 5 h5 l2 2 h11 a1 1 0 0 1 1 1 v10 a1 1 0 0 1-1 1 H3 a1 1 0 0 1-1-1 V6 a1 1 0 0 1 1-1Z" />
      <line x1="7" y1="12" x2="7" y2="16" />
      <line x1="7" y1="14" x2="11" y2="14" />
    </svg>
  )
}

/** Tags: etiqueta com furo */
export function IconTags({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M20 13.5 L12.5 21 a2 2 0 0 1-2.83 0 L3 14.33 a2 2 0 0 1 0-2.83 L10.5 4 H19 a2 2 0 0 1 2 2 V13Z" />
      <circle cx="16" cy="8" r="1.5" />
    </svg>
  )
}

/** Configuração de Artigos: régua com marcações */
export function IconConfiguracaoArtigos({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="2" y="10" width="20" height="5" rx="1" />
      <line x1="6" y1="10" x2="6" y2="8" />
      <line x1="10" y1="10" x2="10" y2="8.5" />
      <line x1="14" y1="10" x2="14" y2="8.5" />
      <line x1="18" y1="10" x2="18" y2="8" />
    </svg>
  )
}

// ──────────────────────────────────────────────
// SUB-MENU FONTES (tipo de crawler)
// ──────────────────────────────────────────────

/** GitHub Crawler: terminal com prompt */
export function IconGithub({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <polyline points="7,9 9,11 7,13" />
      <line x1="11" y1="13" x2="15" y2="13" />
    </svg>
  )
}

/** Docs / Leitura: livro aberto com marcador */
export function IconDocs({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M2 6 Q2 4 4 4 Q8 4 12 7 Q16 4 20 4 Q22 4 22 6 v13 Q22 21 20 21 Q16 21 12 18 Q8 21 4 21 Q2 21 2 19 Z" />
      <line x1="12" y1="7" x2="12" y2="18" />
      <line x1="7" y1="10" x2="10" y2="10" />
      <line x1="7" y1="13" x2="10" y2="13" />
    </svg>
  )
}

/** URL Customizada / Link: elo de corrente */
export function IconLinkCustom({ size = 17, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M10 13 a5 5 0 0 0 7.54.54 l3-3 a5 5 0 0 0-7.07-7.07 l-1.72 1.71" />
      <path d="M14 11 a5 5 0 0 0-7.54-.54 l-3 3 a5 5 0 0 0 7.07 7.07 l1.71-1.71" />
    </svg>
  )
}
