import { Injectable } from '@nestjs/common';

import { SignalCategory, SignalSeverity } from '../../../common/signals';
import { AssetsRepository } from '../../assets/assets.repository';
import { BaseAnomalyDetector } from '../base-anomaly-detector';
import {
  AnomalyEvaluationContext,
  AnomalyEvaluationResult,
} from '../anomalies.types';

@Injectable()
export class BudgetVarianceAnomalyDetector extends BaseAnomalyDetector {
  readonly key = 'assets.budget-variance-anomaly';
  readonly category = SignalCategory.assets;
  readonly description =
    'Detects unusually high maintenance spend by comparing recent maintenance record costs against the recent average maintenance cost baseline.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'intelligence';

  constructor(private readonly assetsRepository: AssetsRepository) {
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
    const baselineWindowStart = new Date(
      now.getTime() - 21 * 24 * 60 * 60 * 1000,
    );

    const records =
      await this.assetsRepository.listMaintenanceRecordsForOrganization(
        context.organizationId,
      );

    const recentRecords = records.filter(
      (record) =>
        record.costAmount !== null &&
        (record.scheduledAt ?? record.createdAt) >= baselineWindowStart,
    );

    if (recentRecords.length === 0) {
      return {
        signals: [],
        evidence: {
          evaluatedRecordCount: 0,
          evaluationBasis:
            'no recent maintenance records with spend data were available',
        },
        metrics: null,
        thresholds: [],
      };
    }

    const numericCosts = recentRecords
      .map((record) => Number(record.costAmount))
      .filter((value) => Number.isFinite(value));

    const recentAverageCost =
      numericCosts.reduce((sum, value) => sum + value, 0) /
      Math.max(numericCosts.length, 1);
    const deviationThreshold = recentAverageCost * 1.5;
    const criticalThreshold = recentAverageCost * 2;

    const flaggedRecords = recentRecords
      .filter((record) => Number(record.costAmount) >= deviationThreshold)
      .sort((left, right) => Number(right.costAmount) - Number(left.costAmount))
      .slice(0, 10);

    const signals = flaggedRecords.map((record) => {
      const cost = Number(record.costAmount);
      const severity =
        cost >= criticalThreshold
          ? SignalSeverity.high
          : SignalSeverity.medium;

      return this.buildSignal({
        signalType: 'assets.maintenance.spend_deviation_detected',
        title: `Maintenance spend deviation for record ${record.id.slice(0, 8)}`,
        summary: `${record.title} has a maintenance cost of ${cost.toFixed(
          2,
        )} ${record.currencyCode ?? 'USD'}, which is above the recent maintenance spend baseline of ${recentAverageCost.toFixed(
          2,
        )}.`,
        severity,
        entityType: 'asset-maintenance-record',
        entityId: record.id,
        relatedEntityIds: record.assetId ? [record.assetId] : null,
        organizationId: context.organizationId,
        evidence: {
          assetId: record.assetId,
          maintenanceType: record.maintenanceType,
          maintenanceStatus: record.status,
          vendorName: record.vendorName,
          scheduledAt: record.scheduledAt,
          createdAt: record.createdAt,
          costAmount: cost,
          currencyCode: record.currencyCode,
        },
        metrics: {
          recordCostAmount: cost,
          recentAverageCost,
          deviationThreshold,
          criticalThreshold,
          baselineRecordCount: numericCosts.length,
          varianceRatio:
            recentAverageCost > 0 ? Number((cost / recentAverageCost).toFixed(2)) : null,
        },
        metadata: {
          evaluationWindowStart: baselineWindowStart.toISOString(),
          evaluationWindowEnd: now.toISOString(),
          detectorVersion: 'v1',
        },
      });
    });

    return {
      signals,
      evidence: {
        evaluatedRecordCount: recentRecords.length,
        flaggedRecordCount: flaggedRecords.length,
        evaluationBasis:
          'maintenance spend deviation is approximated using recent maintenance record costs against a rolling average baseline',
      },
      metrics: {
        recentAverageCost,
        deviationThreshold,
        criticalThreshold,
        evaluatedRecordCount: recentRecords.length,
      },
      thresholds: [
        {
          key: 'baseline_window_days',
          label: 'Recent maintenance spend baseline window',
          value: 21,
          unit: 'days',
        },
        {
          key: 'deviation_multiplier',
          label: 'Deviation multiplier over recent average',
          value: 1.5,
          unit: 'x',
        },
      ],
    };
  }
}
