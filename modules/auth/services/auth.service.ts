import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { AuthRepository } from "../repositories/auth.repository"
import { LoginInput, SignupInput } from "../validators/auth.validator"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "phron-agents-secret-super-key-change-in-prod"
)

export interface UserSessionPayload {
  userId: string
  email: string
  fullName: string
  organizationId: string
  role: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static async generateToken(payload: UserSessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(JWT_SECRET)
  }

  static async verifyToken(token: string): Promise<UserSessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return payload as unknown as UserSessionPayload
    } catch {
      return null
    }
  }

  static async register(input: SignupInput) {
    const existing = await AuthRepository.findUserByEmail(input.email)
    if (existing) {
      throw new Error("El correo electrónico ya se encuentra registrado")
    }

    const passwordHash = await this.hashPassword(input.password)
    const { organization, user } = await AuthRepository.registerOrganizationAndAdmin({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    })

    const token = await this.generateToken({
      userId: user.id,
      email: user.email,
      fullName: user.name,
      organizationId: organization.id,
      role: user.role,
    })

    return { user, organization, token }
  }

  static async authenticate(input: LoginInput) {
    const user = await AuthRepository.findUserByEmail(input.email)
    if (!user) {
      throw new Error("Credenciales inválidas")
    }

    const isValid = await this.verifyPassword(input.password, user.passwordHash)
    if (!isValid) {
      throw new Error("Credenciales inválidas")
    }

    const token = await this.generateToken({
      userId: user.id,
      email: user.email,
      fullName: user.name,
      organizationId: user.organizationId || "",
      role: user.role,
    })

    return { user, token }
  }
}
