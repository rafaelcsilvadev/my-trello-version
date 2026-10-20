import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { Label } from './label.entity';
import { LabelsRepository } from './labels.repository';

// Board is registered here too because LabelsRepository joins and locks
// boards rows; autoLoadEntities registers each entity once.
@Module({
  imports: [TypeOrmModule.forFeature([Label, Board])],
  providers: [LabelsRepository],
})
export class LabelsModule {}
