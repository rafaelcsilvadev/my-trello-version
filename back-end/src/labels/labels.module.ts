import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Label } from './label.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Label])],
})
export class LabelsModule {}
