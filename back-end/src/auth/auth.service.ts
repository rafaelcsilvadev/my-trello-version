import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import { InvalidCredentialsError } from './auth.errors';
import { PasswordHasher } from './password-hasher';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async register({
    name,
    email,
    password,
  }: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.usersRepository.create({
      name,
      email,
      passwordHash,
    });

    return this.issueToken(user);
  }

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(email);

    // An unknown email still pays for one verify, so response time does not
    // reveal whether the email is registered (AUTH-09).
    const matches = user
      ? await this.passwordHasher.verify(password, user.passwordHash)
      : await this.passwordHasher.verifyAgainstDummy(password);

    if (!user || !matches) {
      throw new InvalidCredentialsError();
    }

    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthResult> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return { accessToken, user };
  }
}
