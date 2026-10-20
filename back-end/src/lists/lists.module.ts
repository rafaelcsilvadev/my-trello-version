import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { BoardsModule } from '../boards/boards.module';
import { List } from './list.entity';
import { ListsController } from './lists.controller';
import { ListsRepository } from './lists.repository';
import { ListsService } from './lists.service';

// Board is registered here too because ListsRepository joins and locks
// boards rows; autoLoadEntities registers each entity once.
@Module({
  imports: [TypeOrmModule.forFeature([List, Board]), BoardsModule],
  controllers: [ListsController],
  providers: [ListsRepository, ListsService],
  exports: [ListsService],
})
export class ListsModule {}
