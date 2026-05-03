import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InsightsService } from './insights/insights.service';
import { Category, PublishStatus } from './insights/entities/insight.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Insight } from './insights/entities/insight.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const insightRepo = app.get<Repository<Insight>>('InsightRepository');

  console.log('🌱 Seeding data...');

  const mockData = [
    {
      title_kr: 'KOICA, 베트남 디지털 전환 지원 사업 확대',
      summary_kr: '한국국제협력단(KOICA)은 베트남 정부의 디지털 정부 구현을 위해 1,200만 달러 규모의 신규 ODA 사업을 착수했습니다.',
      body_kr: '베트남의 디지털 경제 성장을 돕기 위한 이번 사업은 공공 행정 서비스의 디지털화와 공무원 역량 강화를 골자로 합니다.',
      category: Category.ODA,
      publish_status: PublishStatus.PUBLISHED,
      published_at: new Date(),
      tags: ['KOICA', '베트남', '디지털전환'],
    },
    {
      title_kr: '2026 IT 트렌드: AI 에이전트의 일상화',
      summary_kr: '단순 대화형 AI를 넘어 사용자의 의도를 파악하고 직접 행동하는 AI 에이전트 기술이 모든 산업의 핵심으로 부상하고 있습니다.',
      body_kr: '전문가들은 2026년이 AI 에이전트가 실무 현장에 본격적으로 투입되는 원년이 될 것으로 전망하고 있습니다.',
      category: Category.IT,
      publish_status: PublishStatus.PUBLISHED,
      published_at: new Date(),
      tags: ['AI', '2026트렌드', '에이전트'],
    },
    {
      title_kr: '정부, 디지털 ODA 추진 전략 발표',
      summary_kr: '정부는 K-디지털 기술을 활용한 ODA 비중을 2030년까지 전체의 30% 수준으로 확대하겠다는 로드맵을 확정했습니다.',
      body_kr: '수출입은행과 KOICA가 협력하여 디지털 인프라 구축과 정책 컨설팅을 패키지로 지원할 예정입니다.',
      category: Category.POLICY,
      publish_status: PublishStatus.PUBLISHED,
      published_at: new Date(),
      tags: ['정부정책', '디지털ODA', '로드맵'],
    }
  ];

  for (const data of mockData) {
    const existing = await insightRepo.findOne({ where: { title_kr: data.title_kr } });
    if (!existing) {
      await insightRepo.save(insightRepo.create(data));
      console.log(`✅ Created: ${data.title_kr}`);
    } else {
      console.log(`⏩ Skipped (exists): ${data.title_kr}`);
    }
  }

  console.log('✨ Seeding completed!');
  await app.close();
}

bootstrap();
