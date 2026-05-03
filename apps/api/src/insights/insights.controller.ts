import { Controller, Get, Param, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('category') category?: string,
  ) {
    return this.insightsService.findPublished(
      Number(limit) || 6, 
      Number(page) || 1,
      category
    );
  }

  @Get('admin')
  findAllAdmin() {
    return this.insightsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.insightsService.findOne(id);
  }
}
