import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight, PublishStatus } from './entities/insight.entity';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepository: Repository<Insight>,
  ) {}

  async findAll() {
    return this.insightRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findPublished(limit: number = 6, page: number = 1, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = { publish_status: PublishStatus.PUBLISHED };
    
    if (category) {
      where.category = category.toLowerCase();
    }

    return this.insightRepository.find({
      where,
      order: { published_at: 'DESC' },
      take: limit,
      skip: skip,
    });
  }

  async findOne(id: string) {
    return this.insightRepository.findOne({
      where: { id, publish_status: PublishStatus.PUBLISHED },
    });
  }
}
