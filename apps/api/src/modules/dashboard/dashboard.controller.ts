import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { QueryDashboardAlertsDto } from './dto/query-dashboard-alerts.dto';
import { QueryDashboardOverviewDto } from './dto/query-dashboard-overview.dto';
import { QueryDashboardTrendDto } from './dto/query-dashboard-trend.dto';
import { DashboardService } from './dashboard.service';

// Canonical dashboard surface uses workforce/operators, assets, and operations summaries.
// Legacy drivers/fleet/dispatch route aliases stay mounted below for compatibility only.
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Permissions(PlatformPermissions.dashboardRead)
  getOverview(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getOverview(request.principal as CurrentPrincipal, query);
  }

  @Get('workforce-summary')
  @Permissions(PlatformPermissions.dashboardRead)
  getWorkforceSummary(
    @Req() request: Request,
    @Query() query: QueryDashboardOverviewDto,
  ) {
    return this.dashboardService.getWorkforceSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get(['operators-summary', 'drivers-summary'])
  @Permissions(PlatformPermissions.dashboardRead)
  getDriversSummary(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getDriversSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get(['assets-summary', 'fleet-summary'])
  @Permissions(PlatformPermissions.dashboardRead)
  getFleetSummary(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getFleetSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get(['operations-summary', 'dispatch-summary'])
  @Permissions(PlatformPermissions.dashboardRead)
  getDispatchSummary(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getDispatchSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('approvals-summary')
  @Permissions(PlatformPermissions.dashboardRead)
  getApprovalsSummary(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getApprovalsSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('workflows-summary')
  @Permissions(PlatformPermissions.dashboardRead)
  getWorkflowsSummary(@Req() request: Request, @Query() query: QueryDashboardOverviewDto) {
    return this.dashboardService.getWorkflowsSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('alerts')
  @Permissions(PlatformPermissions.dashboardAlertsRead)
  getOperationalAlerts(@Req() request: Request, @Query() query: QueryDashboardAlertsDto) {
    return this.dashboardService.getOperationalAlerts(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('trends/workforce')
  @Permissions(PlatformPermissions.dashboardAnalyticsRead)
  getWorkforceTrends(@Req() request: Request, @Query() query: QueryDashboardTrendDto) {
    return this.dashboardService.getWorkforceTrends(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get(['trends/operations', 'trends/dispatch'])
  @Permissions(PlatformPermissions.dashboardAnalyticsRead)
  getDispatchTrends(@Req() request: Request, @Query() query: QueryDashboardTrendDto) {
    return this.dashboardService.getDispatchTrends(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get(['trends/issues', 'trends/incidents'])
  @Permissions(PlatformPermissions.dashboardAnalyticsRead)
  getIncidentTrends(@Req() request: Request, @Query() query: QueryDashboardTrendDto) {
    return this.dashboardService.getIncidentTrends(
      request.principal as CurrentPrincipal,
      query,
    );
  }
}
