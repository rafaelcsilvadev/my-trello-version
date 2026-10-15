import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JwtModule,
  type JwtModuleOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
import type { Env } from '../config/env.schema';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';

export function createJwtOptions(
  config: ConfigService<Env, true>,
): JwtModuleOptions {
  return {
    secret: config.get('JWT_SECRET', { infer: true }),
    signOptions: {
      algorithm: 'HS256',
      // The env schema already restricts it to ms-style values like "1h".
      expiresIn: config.get('JWT_EXPIRES_IN', {
        infer: true,
      }) as JwtSignOptions['expiresIn'],
    },
    verifyOptions: { algorithms: ['HS256'] },
  };
}

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),
  ],
  providers: [AuthService, PasswordHasher],
})
export class AuthModule {}
