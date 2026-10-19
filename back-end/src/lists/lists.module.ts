import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { List } from './list.entity';
import { ListsRepository } from './lists.repository';

// Board is registered here too because ListsRepository joins and locks
// boards rows; autoLoadEntities registers each entity once.
@Module({
  imports: [TypeOrmModule.forFeature([List, Board])],
  providers: [ListsRepository],
})
export class ListsModule {}
