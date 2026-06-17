import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'

export interface TokenPayload extends JWTPayload {
  userId: number
  email: string
  role: string
}

/** Art. 46 LGPD — retorna o secret JWT; lança erro em runtime se ausente (sem fallback inseguro). */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o servidor.'
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: {
  userId: number
  email: string
  role: string
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
