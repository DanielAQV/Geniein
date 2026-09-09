import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CareersService } from './careers.service';
import { sanitizeJobPostingInput } from './dto/job-posting.dto';
import { ServiceTokenGuard } from '../common/guards/service-token.guard';

@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Get()
  findAll() {
    return this.careersService.findPublished();
  }

  // ★ 'admin' 라우트는 ':id' 보다 위에 있어야 한다.
  //   아래로 내려가면 Nest 가 'admin' 을 id 로 먹고 공개 조회가 걸린다.
  @Get('admin')
  @UseGuards(ServiceTokenGuard)
  findAllAdmin() {
    return this.careersService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(ServiceTokenGuard)
  findOneAdmin(@Param('id') id: string) {
    return this.careersService.findOne(id);
  }

  @Post('admin')
  @UseGuards(ServiceTokenGuard)
  create(@Body() body: unknown) {
    return this.careersService.create(sanitizeJobPostingInput(body, { partial: false }));
  }

  @Patch('admin/:id')
  @UseGuards(ServiceTokenGuard)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.careersService.update(id, sanitizeJobPostingInput(body, { partial: true }));
  }

  @Delete('admin/:id')
  @UseGuards(ServiceTokenGuard)
  remove(@Param('id') id: string) {
    return this.careersService.remove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.careersService.findPublishedOne(id);
  }
}
