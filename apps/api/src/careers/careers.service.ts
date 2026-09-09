import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting, JobPublishStatus } from './entities/job-posting.entity';
import { JobPostingInput } from './dto/job-posting.dto';

@Injectable()
export class CareersService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly repository: Repository<JobPosting>,
  ) {}

  /** 공개 목록. 게시본만 나간다 — 초안이 새면 채용 계획이 먼저 알려진다. */
  async findPublished() {
    return this.repository.find({
      where: { publish_status: JobPublishStatus.PUBLISHED },
      order: { sort_order: 'ASC', published_at: 'DESC', created_at: 'DESC' },
    });
  }

  async findPublishedOne(id: string) {
    const found = await this.repository.findOne({
      where: { id, publish_status: JobPublishStatus.PUBLISHED },
    });
    if (!found) throw new NotFoundException();
    return found;
  }

  /** 관리자 목록. 초안·보관본까지 전부. 인가는 컨트롤러의 가드가 본다. */
  async findAll() {
    return this.repository.find({
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const found = await this.repository.findOne({ where: { id } });
    if (!found) throw new NotFoundException();
    return found;
  }

  async create(input: JobPostingInput) {
    const entity = this.repository.create({
      ...input,
      // 만들자마자 게시로 들어오면 published_at 도 같이 찍는다
      published_at:
        input.publish_status === JobPublishStatus.PUBLISHED ? new Date() : null,
    });
    return this.repository.save(entity);
  }

  async update(id: string, input: JobPostingInput) {
    const existing = await this.findOne(id);

    // draft → published 로 넘어가는 순간에만 published_at 을 찍는다.
    // 매번 갱신하면 "언제 처음 공개됐나"를 잃는다.
    const becomesPublished =
      input.publish_status === JobPublishStatus.PUBLISHED &&
      existing.publish_status !== JobPublishStatus.PUBLISHED;

    Object.assign(existing, input);
    if (becomesPublished) existing.published_at = new Date();

    return this.repository.save(existing);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.repository.remove(existing);
    return { id };
  }
}
