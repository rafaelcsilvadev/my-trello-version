import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './board.entity';
import { BoardsRepository } from './boards.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Board])],
  providers: [BoardsRepository],
})
export class BoardsModule {}
