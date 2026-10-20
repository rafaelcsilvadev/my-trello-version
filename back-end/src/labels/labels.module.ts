import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../boards/board.entity';
import { BoardsModule } from '../boards/boards.module';
import { Label } from './label.entity';
import { LabelsController } from './labels.controller';
import { LabelsRepository } from './labels.repository';
import { LabelsService } from './labels.service';

// Board is registered here too because LabelsRepository joins and locks
// boards rows; autoLoadEntities registers each entity once.
@Module({
  imports: [TypeOrmModule.forFeature([Label, Board]), BoardsModule],
  controllers: [LabelsController],
  providers: [LabelsRepository, LabelsService],
})
export class LabelsModule {}
