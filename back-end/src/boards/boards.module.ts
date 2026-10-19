import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './board.entity';
import { BoardsRepository } from './boards.repository';
import { BoardsService } from './boards.service';

@Module({
  imports: [TypeOrmModule.forFeature([Board])],
  providers: [BoardsRepository, BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
