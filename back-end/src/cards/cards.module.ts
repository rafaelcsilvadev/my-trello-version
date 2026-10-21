import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { BoardsModule } from '../boards/boards.module';
import { Label } from '../labels/label.entity';
import { List } from '../lists/list.entity';
import { ListsModule } from '../lists/lists.module';
import { Card } from './card.entity';
import { CardLabelsController } from './card-labels.controller';
import { CardsController } from './cards.controller';
import { CardsRepository } from './cards.repository';
import { CardsService } from './cards.service';

// List, Board and Label are registered here too because CardsRepository
// joins lists and boards, locks boards rows and reads labels;
// autoLoadEntities registers each entity once.
@Module({
  imports: [
    TypeOrmModule.forFeature([Card, List, Board, Label]),
    ListsModule,
    BoardsModule,
  ],
  controllers: [CardsController, CardLabelsController],
  providers: [CardsRepository, CardsService],
  exports: [CardsService],
})
export class CardsModule {}
