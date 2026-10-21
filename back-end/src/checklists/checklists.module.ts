import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { Card } from '../cards/card.entity';
import { List } from '../lists/list.entity';
import { ChecklistItem } from './checklist-item.entity';
import { ChecklistItemsRepository } from './checklist-items.repository';

// Card, List and Board are registered here too because
// ChecklistItemsRepository joins them to scope items by owner;
// autoLoadEntities registers each entity once.
@Module({
  imports: [TypeOrmModule.forFeature([ChecklistItem, Card, List, Board])],
  providers: [ChecklistItemsRepository],
})
export class ChecklistsModule {}
