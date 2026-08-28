import { Injectable } from '@nestjs/common';

import { SignalCategory, SignalSeverity } from '../../../common/signals';
import { ScheduleShiftsRepository } from '../../scheduling/schedule-shifts.repository';
import { WorkforceQueryService } from '../../workforce/workforce-query.service';
import { BaseAnomalyDetector } from '../base-anomaly-detector';
import {
  AnomalyEvaluationContext,
  AnomalyEvaluationResult,
} from '../anomalies.types';

@Injectable()
export class WorkforceAttendanceAnomalyDetector extends BaseAnomalyDetector {
  readonly key = 'people.attendance-anomaly';
  readonly category = SignalCategory.people;
  readonly description =
    'Detects workforce presence anomalies by identifying active or near-term scheduled shifts whose assignment coverage is below required capacity.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'intelligence';

  constructor(
    private readonly scheduleShiftsRepository: ScheduleShiftsRepository,
    private readonly workforceQueryService: WorkforceQueryService,
  ) {
    super();
  }

  async evaluate(
    context: AnomalyEvaluationContext,
  ): Promise<AnomalyEvaluationResult> {
    if (!context.organizationId) {
      return {
        signals: [],
        evidence: null,
        metrics: null,
        thresholds: [],
      };
    }

    const now = new Date();
    const nextTwentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const candidateShifts = await this.scheduleShiftsRepository.listShifts(
      {
        organizationId: context.organizationId,
        OR: [
          { status: 'ACTIVE' },
          {
            status: 'SCHEDULED',
            startsAt: {
              gte: new Date(now.getTime() - 12 * 60 * 60 * 1000),
              lte: nextTwentyFourHours,
            },
          },
        ],
      },
      0,
      100,
    );

    const readinessSummaryResponse =
      await this.workforceQueryService.getWorkforceReadinessSummary(
        context.organizationId,
      );
    const readinessSummary =
      'data' in readinessSummaryResponse ? readinessSummaryResponse.data : null;

    const shiftCoverage = await Promise.all(
      candidateShifts.map(async (shift) => {
        const assignedCount = await this.scheduleShiftsRepository.countAssignments(
          shift.id,
        );
        const required = shift.capacityRequired ?? 0;
        const allocated = shift.capacityAllocated ?? assignedCount;
        const gap = Math.max(required - assignedCount, 0);

        return {
          shift,
          assignedCount,
          required,
          allocated,
          gap,
        };
      }),
    );

    const flaggedShifts = shiftCoverage
      .filter((entry) => entry.required > 0 && entry.gap > 0)
      .sort((left, right) => {
        if (right.gap !== left.gap) {
          return right.gap - left.gap;
        }

        return (
          new Date(left.shift.startsAt).getTime() -
          new Date(right.shift.startsAt).getTime()
        );
      })
      .slice(0, 10);

    const signals = flaggedShifts.map((entry) => {
      const severity =
        entry.shift.status === 'ACTIVE' && entry.gap >= 2
          ? SignalSeverity.high
          : entry.gap >= 2
            ? SignalSeverity.medium
            : SignalSeverity.low;

      return this.buildSignal({
        signalType: 'people.attendance.coverage_gap_detected',
        title: `Coverage gap for shift ${entry.shift.shiftCode}`,
        summary:
          entry.shift.status === 'ACTIVE'
            ? `${entry.shift.title} is active with ${entry.gap} fewer assigned workers than required.`
            : `${entry.shift.title} is scheduled with ${entry.gap} fewer assigned workers than required.`,
        severity,
        entityType: 'schedule-shift',
        entityId: entry.shift.id,
        organizationId: context.organizationId,
        evidence: {
          shiftCode: entry.shift.shiftCode,
          shiftTitle: entry.shift.title,
          shiftStatus: entry.shift.status,
          startsAt: entry.shift.startsAt,
          endsAt: entry.shift.endsAt,
          capacityRequired: entry.required,
          capacityAllocated: entry.allocated,
          assignedCount: entry.assignedCount,
        },
        metrics: {
          coverageGap: entry.gap,
          requiredWorkers: entry.required,
          assignedWorkers: entry.assignedCount,
          availableWorkforceCount: readinessSummary?.availableCount ?? null,
          activeWorkforceCount: readinessSummary?.activeCount ?? null,
        },
        metadata: {
          evaluationWindowStart: new Date(
            now.getTime() - 12 * 60 * 60 * 1000,
          ).toISOString(),
          evaluationWindowEnd: nextTwentyFourHours.toISOString(),
          detectorVersion: 'v1',
        },
      });
    });

    return {
      signals,
      evidence: {
        evaluatedShiftCount: candidateShifts.length,
        flaggedShiftCount: flaggedShifts.length,
        evaluationBasis:
          'attendance is approximated using active or near-term scheduled shift coverage against live assignment counts',
      },
      metrics: {
        availableWorkforceCount: readinessSummary?.availableCount ?? null,
        activeWorkforceCount: readinessSummary?.activeCount ?? null,
        compliantWorkforceCount: readinessSummary?.compliantCount ?? null,
        expiringSoonCount: readinessSummary?.expiringSoonCount ?? null,
      },
      thresholds: [
        {
          key: 'shift_window_hours',
          label: 'Scheduled shift lookahead window',
          value: 24,
          unit: 'hours',
        },
        {
          key: 'active_shift_backtrack_hours',
          label: 'Recent shift backtrack window',
          value: 12,
          unit: 'hours',
        },
      ],
    };
  }
}
