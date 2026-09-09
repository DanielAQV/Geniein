import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';
import { JobPosting } from './entities/job-posting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobPosting])],
  controllers: [CareersController],
  providers: [CareersService],
})
export class CareersModule {}
