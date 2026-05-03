import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { Insight } from './entities/insight.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Insight])],
  controllers: [InsightsController],
  providers: [InsightsService]
})
export class InsightsModule {}
