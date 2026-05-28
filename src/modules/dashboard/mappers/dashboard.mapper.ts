import { plainToInstance } from 'class-transformer';
import { DashboardDataDto } from '@/modules/dashboard/dto/dashboard.data.dto';
import { DashboardData } from '@/modules/dashboard/interfaces/dashboard.data.interface';

export class DashboardMapper {
  static toDto(data: DashboardData): DashboardDataDto {
    return plainToInstance(DashboardDataDto, data, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }
}
