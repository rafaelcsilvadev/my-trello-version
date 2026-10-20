import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { List } from '../lists/list.entity';
import { Card } from './card.entity';
import { CardsRepository } from './cards.repository';

// List and Board are registered here too because CardsRepository joins lists
// and boards and locks boards rows; autoLoadEntities registers each entity
// once.
@Module({
  imports: [TypeOrmModule.forFeature([Card, List, Board])],
  providers: [CardsRepository],
})
export class CardsModule {}
