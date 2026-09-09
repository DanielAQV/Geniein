import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { ServiceTokenGuard } from '../common/guards/service-token.guard';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.insightsService.findPublished(
      Number(limit) || 6, 
      Number(page) || 1,
      category,
      tag
    );
  }

  // 초안까지 전부 반환한다. 공개 목록(findPublished)과 달리 인가가 필수다.
  @Get('admin')
  @UseGuards(ServiceTokenGuard)
  findAllAdmin() {
    return this.insightsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.insightsService.findOne(id);
  }
}
