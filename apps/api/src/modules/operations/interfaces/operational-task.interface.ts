/**
 * OperationalTask is the universal read abstraction for a unit of coordinated work
 * inside the company OS.
 *
 * It intentionally sits above dispatch-era run terminology so callers can consume
 * a stable task view today while seeded taxi-oriented operational records are still
 * present underneath the platform.
 */
export interface OperationalTask {
  id: string;
  organizationId: string;
  displayName: string;
  taskType: string;
  status: string;
  sourceModule: 'dispatch';
  relatedAssignmentId: string | null;
  zoneId: string | null;
  createdAt: Date;
}
