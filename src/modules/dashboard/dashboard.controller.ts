import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JobsService } from '@/modules/jobs/jobs.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DashboardData,
  ParseDates,
  RecentActivityResponse,
} from '@/modules/dashboard/interfaces/dashboard-data.interface';

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

  @Get()
  async getDashboardData(
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DashboardData> {
    const userId = req.user.sub;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.jobsService.getStats(userId, start, end);

    if (stats.metrics.totalDocuments === 0 && !startDate) {
      return {
        ...stats,
        message: 'Start your first analysis',
        emptyState: true,
      };
    }

    return stats;
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get paginated recent activity' })
  async getRecentActivity(
    @Req() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<RecentActivityResponse> {
    return this.jobsService.getRecentActivity(
      req.user.sub,
      page,
      limit,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  private parseDates(startDate?: string, endDate?: string): ParseDates {
    return {
      start: startDate
        ? new Date(startDate)
        : new Date(new Date().setDate(new Date().getDate() - 30)),
      end: endDate ? new Date(endDate) : new Date(),
    };
  }
}
