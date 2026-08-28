import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPaginatedResponse, buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryDecisionReportsDto } from './dto/query-decision-reports.dto';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async list(query: QueryDecisionReportsDto) {
    const result = await this.reportRepository.query(query);
    return buildPaginatedResponse('Decision reports retrieved successfully.', result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
    });
  }

  async findOne(id: string) {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Decision report not found.');
    }

    return buildSuccessResponse('Decision report retrieved successfully.', report);
  }

  async findByAgentRun(runId: string) {
    return buildSuccessResponse(
      'Decision reports for agent run retrieved successfully.',
      await this.reportRepository.findByAgentRunId(runId),
    );
  }

  async getExecutiveSummary(organizationId?: string) {
    const report = await this.reportRepository.findExecutiveSummary(organizationId);
    if (!report) {
      throw new NotFoundException('Executive summary report not found.');
    }

    return buildSuccessResponse('Executive summary report retrieved successfully.', report);
  }
}
