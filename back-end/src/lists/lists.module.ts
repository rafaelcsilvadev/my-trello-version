import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { List } from './list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([List])],
})
export class ListsModule {}
