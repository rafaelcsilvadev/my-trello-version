import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { BoardsModule } from '../boards/boards.module';
import { List } from '../lists/list.entity';
import { ListsModule } from '../lists/lists.module';
import { Card } from './card.entity';
import { CardsController } from './cards.controller';
import { CardsRepository } from './cards.repository';
import { CardsService } from './cards.service';

// List and Board are registered here too because CardsRepository joins lists
// and boards and locks boards rows; autoLoadEntities registers each entity
// once.
@Module({
  imports: [
    TypeOrmModule.forFeature([Card, List, Board]),
    ListsModule,
    BoardsModule,
  ],
  controllers: [CardsController],
  providers: [CardsRepository, CardsService],
})
export class CardsModule {}
