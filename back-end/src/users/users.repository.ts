import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EmailAlreadyRegisteredError } from '../auth/auth.errors';
import { User } from './user.entity';

const UNIQUE_VIOLATION = '23505';
const EMAIL_UNIQUE_CONSTRAINT = 'UQ_users_email';

export type CreateUserInput = Pick<User, 'name' | 'email' | 'passwordHash'>;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // Relies on the unique constraint instead of a prior lookup, so two
  // concurrent registrations cannot both succeed (AUTH-20).
  async create(input: CreateUserInput): Promise<User> {
    try {
      return await this.users.save(this.users.create(input));
    } catch (error) {
      if (isEmailConflict(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }
}

function isEmailConflict(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const { code, constraint } = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return code === UNIQUE_VIOLATION && constraint === EMAIL_UNIQUE_CONSTRAINT;
}
