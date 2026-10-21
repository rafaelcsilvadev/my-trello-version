import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistItem } from './checklist-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChecklistItem])],
})
export class ChecklistsModule {}
