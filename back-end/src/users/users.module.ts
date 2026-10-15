import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeController } from './me.controller';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [MeController],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
