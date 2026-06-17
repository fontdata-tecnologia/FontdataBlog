/**
 * Extrai um objeto JSON da saída bruta de um LLM, que pode conter prosa,
 * cercas de código markdown, aspas não-escapadas ou JSON truncado.
 *
 * Retorna o valor parseado ou null — NUNCA lança.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null

  // 1. Remove cercas markdown ```json ... ``` e faz trim.
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // 2. Tenta JSON.parse direto no texto limpo.
  try {
    return JSON.parse(stripped) as T
  } catch {
    // segue para varredura balanceada
  }

  // 3. Varre a string procurando blocos { ... } balanceados.
  //    Conta { e } respeitando strings entre aspas e escapes \", para não
  //    contar chaves que estejam dentro de valores string.
  const candidates: string[] = []
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] !== '{') continue

    let depth = 0
    let inString = false
    let j = i

    while (j < stripped.length) {
      const ch = stripped[j]

      if (inString) {
        if (ch === '\\') {
          j += 2 // pula o próximo caractere escapado
          continue
        }
        if (ch === '"') inString = false
      } else {
        if (ch === '"') inString = true
        else if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            candidates.push(stripped.slice(i, j + 1))
            break
          }
        }
      }
      j++
    }
  }

  // Tenta parsear cada candidato e retorna o de maior comprimento válido.
  let best: T | null = null
  let bestLen = -1
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as T
      if (candidate.length > bestLen) {
        best = parsed
        bestLen = candidate.length
      }
    } catch {
      // candidato inválido, continua
    }
  }
  if (best !== null) return best

  // 4. Reparo leve: tenta corrigir aspas não-escapadas dentro de valores string.
  //    Substitui `": "...<aspas não-escapadas>..."` por versão com aspas escapadas.
  const repaired = stripped.replace(
    /:\s*"((?:[^"\\]|\\.)*)"/g,
    (_match, inner: string) => {
      const fixed = inner.replace(/(?<!\\)"/g, '\\"')
      return `: "${fixed}"`
    }
  )
  try {
    return JSON.parse(repaired) as T
  } catch {
    // tenta bloco balanceado no texto reparado
    for (let i = 0; i < repaired.length; i++) {
      if (repaired[i] !== '{') continue
      let depth = 0
      let inString = false
      let j = i
      while (j < repaired.length) {
        const ch = repaired[j]
        if (inString) {
          if (ch === '\\') { j += 2; continue }
          if (ch === '"') inString = false
        } else {
          if (ch === '"') inString = true
          else if (ch === '{') depth++
          else if (ch === '}') {
            depth--
            if (depth === 0) {
              try {
                return JSON.parse(repaired.slice(i, j + 1)) as T
              } catch { break }
            }
          }
        }
        j++
      }
    }
  }

  return null
}
