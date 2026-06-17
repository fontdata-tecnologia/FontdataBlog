// lib/cover-svg.ts
// Geração de capas SVG 1200×630 via código — sem dependências externas, sem IA, sem custo.
// As funções recebem primary/secondary como parâmetros; quem chama (designer.ts) obtém as
// cores via getSettings(). Nenhum hex fixo aqui — apenas white (#ffffff) e neutros para
// sombras de texto.

import { darkenHex, lightenHex } from '@/lib/settings'

// ---------------------------------------------------------------------------
// Utils internos
// ---------------------------------------------------------------------------

/** Escapa caracteres especiais XML para uso seguro em atributos e texto SVG. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Quebra o título em linhas de no máximo `maxChars` caracteres, respeitando
 * palavras. Retorna no máximo `maxLines` linhas; a última recebe reticências
 * se o texto foi truncado.
 */
function wrapTitle(title: string, maxChars = 28, maxLines = 4): string[] {
  const words = title.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) lines.push(current)
      // Se a própria palavra ultrapassa maxChars, trunca
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word
    }
    if (lines.length >= maxLines) break
  }
  if (current && lines.length < maxLines) lines.push(current)

  // Trunca com reticências na última linha se houve overflow
  if (lines.length === maxLines) {
    const remainingWords = words.slice(
      words.findIndex((_, i) => {
        const soFar = words.slice(0, i + 1).join(' ')
        return soFar.length > lines.join(' ').length + lines.length
      })
    )
    if (remainingWords.length > 0) {
      const last = lines[maxLines - 1]
      lines[maxLines - 1] = last.length > maxChars - 1
        ? last.slice(0, maxChars - 2) + '…'
        : last + '…'
    }
  }

  return lines
}

// ---------------------------------------------------------------------------
// Hash DJB2 determinístico (para geometric)
// ---------------------------------------------------------------------------
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h >>> 0 // mantém unsigned 32-bit
  }
  return h
}

/** Pseudo-RNG determinístico baseado em djb2 do seed. */
function makeRng(seed: string) {
  let state = djb2(seed)
  return function next(min: number, max: number): number {
    state = ((state * 1664525) + 1013904223) >>> 0
    return min + (state % (max - min + 1))
  }
}

// ---------------------------------------------------------------------------
// Fase 1: Gradient Cover
// ---------------------------------------------------------------------------

export interface GradientCoverOptions {
  title: string
  category?: string
  primary: string   // hex, ex: '#1A4FA0'
  secondary: string // hex, ex: '#F58A2D'
}

/**
 * Gera um SVG 1200×630 com gradiente linear primary→secondary,
 * título em branco com quebra de linha automática, label de categoria
 * e wordmark "ExpX" no canto inferior direito.
 */
export function generateGradientCover(opts: GradientCoverOptions): string {
  const { title, category, primary, secondary } = opts

  const darkPrimary = darkenHex(primary, 0.3)
  const lines = wrapTitle(escapeXml(title), 28, 4)

  // Cada linha ocupa ~90px; centraliza verticalmente o bloco de texto
  const lineHeight = 90
  const fontSize = 72
  const totalTextHeight = lines.length * lineHeight
  const startY = Math.round((630 - totalTextHeight) / 2) + fontSize * 0.75

  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight
      return `<text
        x="600"
        y="${y}"
        font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
        filter="url(#shadow)"
      >${line}</text>`
    })
    .join('\n      ')

  const categoryElement = category
    ? `<text
        x="60"
        y="580"
        font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
        font-size="24"
        font-weight="600"
        fill="#ffffff"
        opacity="0.85"
        letter-spacing="3"
        text-anchor="start"
      >${escapeXml(category.toUpperCase())}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="60%" stop-color="${darkPrimary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.45" />
    </filter>
    <filter id="badgeShadow" x="-10%" y="-20%" width="120%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Fundo gradiente -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Overlay sutil para profundidade -->
  <rect width="1200" height="630" fill="rgba(0,0,0,0.08)" />

  <!-- Linha decorativa inferior -->
  <rect x="0" y="610" width="1200" height="20" fill="${secondary}" opacity="0.9" />

  <!-- Título -->
  ${textElements}

  <!-- Label categoria -->
  ${categoryElement}

  <!-- Wordmark ExpX -->
  <text
    x="1140"
    y="590"
    font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
    font-size="22"
    font-weight="800"
    fill="#ffffff"
    opacity="0.7"
    text-anchor="end"
    letter-spacing="1"
  >ExpX</text>
</svg>`
}

// ---------------------------------------------------------------------------
// Fase 2: Geometric Cover
// ---------------------------------------------------------------------------

export interface GeometricCoverOptions {
  seed: string      // geralmente o título do artigo
  primary: string   // hex
  secondary: string // hex
}

/**
 * Gera um SVG 1200×630 com formas geométricas abstratas distribuídas
 * deterministicamente a partir de um hash do seed. Sem texto visível.
 * Paleta derivada de primary e secondary via opacidades e variações.
 */
export function generateGeometricCover(opts: GeometricCoverOptions): string {
  const { seed, primary, secondary } = opts
  const rng = makeRng(seed)

  const darkBg = darkenHex(primary, 0.35)
  const lightSecondary = lightenHex(secondary, 0.25)
  const darkSecondary = darkenHex(secondary, 0.25)

  const palette = [primary, secondary, lightSecondary, darkSecondary, '#ffffff']

  // Gera círculos
  const circles = Array.from({ length: 12 }, (_, i) => {
    const cx = rng(50, 1150)
    const cy = rng(30, 600)
    const r = rng(30, 180)
    const color = palette[rng(0, palette.length - 1)]
    const opacity = (rng(15, 65) / 100).toFixed(2)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" />`
  }).join('\n  ')

  // Gera retângulos rotacionados
  const rects = Array.from({ length: 8 }, (_, i) => {
    const x = rng(-80, 1100)
    const y = rng(-80, 550)
    const w = rng(80, 400)
    const h = rng(40, 200)
    const rot = rng(-45, 45)
    const color = palette[rng(0, palette.length - 1)]
    const opacity = (rng(10, 45) / 100).toFixed(2)
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="${opacity}" transform="rotate(${rot},${x + w / 2},${y + h / 2})" />`
  }).join('\n  ')

  // Gera triângulos (polígonos)
  const triangles = Array.from({ length: 6 }, (_, i) => {
    const cx = rng(100, 1100)
    const cy = rng(100, 530)
    const size = rng(40, 160)
    const rot = rng(0, 360)
    const color = palette[rng(0, palette.length - 1)]
    const opacity = (rng(15, 55) / 100).toFixed(2)
    // Triângulo equilátero centrado em (cx, cy)
    const h2 = Math.round(size * 0.866)
    const p1 = `${cx},${cy - Math.round(size * 0.577 * 2)}`
    const p2 = `${cx - size},${cy + Math.round(size * 0.577)}`
    const p3 = `${cx + size},${cy + Math.round(size * 0.577)}`
    return `<polygon points="${p1} ${p2} ${p3}" fill="${color}" opacity="${opacity}" transform="rotate(${rot},${cx},${cy})" />`
  }).join('\n  ')

  // Linhas diagonais decorativas
  const lines = Array.from({ length: 5 }, (_, i) => {
    const x1 = rng(0, 1200)
    const y1 = rng(0, 630)
    const x2 = rng(0, 1200)
    const y2 = rng(0, 630)
    const sw = rng(1, 6)
    const color = palette[rng(0, palette.length - 1)]
    const opacity = (rng(10, 35) / 100).toFixed(2)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" />`
  }).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <!-- Fundo sólido derivado de primary -->
  <rect width="1200" height="630" fill="${darkBg}" />

  <!-- Camada de formas geométricas -->
  ${circles}
  ${rects}
  ${triangles}
  ${lines}

  <!-- Barra de acento inferior -->
  <rect x="0" y="608" width="1200" height="22" fill="${secondary}" opacity="0.6" />
</svg>`
}
