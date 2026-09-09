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

  async findPublished(limit: number = 6, page: number = 1, category?: string, tag?: string) {
    const skip = (page - 1) * limit;
    const where: any = { publish_status: PublishStatus.PUBLISHED };
    
    if (category) {
      where.category = category.toLowerCase();
    }

    if (tag) {
      // Postgres-specific tag array overlap check
      return this.insightRepository.createQueryBuilder('insight')
        .where('insight.publish_status = :status', { status: PublishStatus.PUBLISHED })
        .andWhere(category ? 'insight.category = :category' : '1=1', { category: category?.toLowerCase() })
        .andWhere(':tag = ANY(insight.tags)', { tag })
        .orderBy('insight.published_at', 'DESC')
        .take(limit)
        .skip(skip)
        .getMany();
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
