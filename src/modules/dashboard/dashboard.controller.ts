import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { JobsService } from '@/modules/jobs/jobs.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

import { DashboardDataDto } from './dto/dashboard.data.dto';
import { DashboardMapper } from './mappers/dashboard.mapper';
import { RecentActivityResponseDto } from './dto/recent.activity.response.dto';
import { DashboardQueryDto } from './dto/dashboard.query.dto';
import { AnalysesQueryDto } from './dto/analyses.query.dto';
import { RecentActivityDto } from './dto/recent.activity.dto';

interface RequestWithUser extends Request {
  user: {
    sub: string;
  };
}

@Controller('app/dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview analytics',
  })
  @ApiOkResponse({
    type: DashboardDataDto,
  })
  async getDashboardOverview(
    @Req() req: RequestWithUser,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardDataDto> {
    const userId = req.user.sub;

    const start =
      query.startDate && !isNaN(new Date(query.startDate).getTime())
        ? new Date(query.startDate)
        : undefined;

    const end =
      query.endDate && !isNaN(new Date(query.endDate).getTime())
        ? new Date(query.endDate)
        : undefined;

    const stats = await this.jobsService.getStats(userId, start, end, query.framework);

    const dto = DashboardMapper.toDto(stats);

    if (dto.metrics.totalDocuments === 0 && !query.startDate) {
      return {
        ...dto,
        message: 'Start your first analysis',
        emptyState: true,
      };
    }

    return dto;
  }
}

@Controller('app/analyses')
@ApiTags('Analyses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated analyses for table',
  })
  @ApiOkResponse({
    type: RecentActivityResponseDto,
  })
  async getAnalyses(
    @Req() req: RequestWithUser,
    @Query() query: AnalysesQueryDto,
  ): Promise<RecentActivityResponseDto> {
    const start =
      query.startDate && !isNaN(new Date(query.startDate).getTime())
        ? new Date(query.startDate)
        : undefined;

    const end =
      query.endDate && !isNaN(new Date(query.endDate).getTime())
        ? new Date(query.endDate)
        : undefined;

    return this.jobsService.getRecentActivity(
      req.user.sub,
      query.page,
      query.limit,
      start,
      end,
      query.framework,
      query.search,
      query.status,
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export all analyses without pagination',
  })
  @ApiOkResponse({
    type: [RecentActivityDto],
  })
  async exportAnalyses(@Req() req: RequestWithUser, @Query() query: AnalysesQueryDto) {
    const start =
      query.startDate && !isNaN(new Date(query.startDate).getTime())
        ? new Date(query.startDate)
        : undefined;

    const end =
      query.endDate && !isNaN(new Date(query.endDate).getTime())
        ? new Date(query.endDate)
        : undefined;

    return this.jobsService.getAnalysesExport(
      req.user.sub,
      start,
      end,
      query.framework,
      query.search,
      query.status,
    );
  }
}
