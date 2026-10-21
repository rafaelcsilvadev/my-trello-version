import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { Card } from '../cards/card.entity';
import { CardsModule } from '../cards/cards.module';
import { List } from '../lists/list.entity';
import { ChecklistItem } from './checklist-item.entity';
import { ChecklistItemsController } from './checklist-items.controller';
import { ChecklistItemsRepository } from './checklist-items.repository';
import { ChecklistItemsService } from './checklist-items.service';

// Card, List and Board are registered here too because
// ChecklistItemsRepository joins them to scope items by owner;
// autoLoadEntities registers each entity once. CardsModule provides the
// card write flow; it never imports this module, so there is no cycle.
@Module({
  imports: [
    TypeOrmModule.forFeature([ChecklistItem, Card, List, Board]),
    CardsModule,
  ],
  controllers: [ChecklistItemsController],
  providers: [ChecklistItemsRepository, ChecklistItemsService],
})
export class ChecklistsModule {}
