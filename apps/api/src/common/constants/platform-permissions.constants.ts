/**
 * Canonical contributor-facing permission surface.
 *
 * Important:
 * - Prefer operator/workforce, asset, and operations keys for all new development.
 * - Raw permission codes intentionally remain compatibility-backed (`driver.*`, `fleet.*`,
 *   `dispatch.*`) until stored contracts can be retired safely.
 * - This map provides the canonical mapping between enterprise-grade symbols and 
 *   legacy database values.
 */
export const PlatformPermissions = {
  // Organizational & Structural
  organizationRead: 'organization.read',
  organizationManage: 'organization.manage',
  departmentRead: 'department.read',
  departmentManage: 'department.manage',
  positionRead: 'position.read',
  positionManage: 'position.manage',
  employeeRead: 'employee.read',
  employeeManage: 'employee.manage',

  // Governance & Workflows
  workflowRead: 'workflow.read',
  workflowManage: 'workflow.manage',
  workflowAct: 'workflow.execute',
  workflowDefinitionManage: 'workflow.manage',
  approvalRead: 'approval-queue.read',
  approvalManage: 'approval-queue.manage',
  approvalAct: 'approval-queue.approve',
  approvalRequestCreate: 'approval-queue.manage',

  // Workforce (Personnel & Operators)
  operatorRead: 'driver.read',
  operatorManage: 'driver.manage',
  operatorDocumentManage: 'driver.document.manage',
  operatorStatusManage: 'driver.status.manage',

  // Assets (Managed Equipment & Vehicles)
  assetRead: 'fleet.read',
  assetManage: 'fleet.manage',
  assetMaintenanceManage: 'fleet.schedule',
  assetStatusManage: 'fleet.manage',

  // Operations & Work Execution
  operationsRead: 'dispatch.read',
  operationsManage: 'dispatch.manage',
  operationsAssignmentManage: 'dispatch.intervene',
  operationsRunManage: 'dispatch.manage',
  operationsIssueManage: 'dispatch.intervene',

  // Intelligence & Observability
  dashboardRead: 'analytics.read',
  dashboardAlertsRead: 'analytics.read',
  dashboardAnalyticsRead: 'analytics.read',
  intelligenceRead: 'intelligence.read',
  intelligenceGenerate: 'intelligence.execute',
  intelligenceReview: 'intelligence.review',
  intelligenceAdmin: 'intelligence.manage',
  agentRead: 'intelligence.read',
  agentRun: 'intelligence.execute',
  agentReview: 'intelligence.review',
  agentAdmin: 'intelligence.manage',

  // System & Notifications
  notificationRead: 'user.read',
  notificationManage: 'user.read',
  securityRead: 'permission.read',
  userRead: 'user.read',
} as const;

/**
 * Canonical-to-legacy resource mapping for contributor guidance.
 *
 * This is documentation data, not a runtime transformation layer.
 */
export const CanonicalPermissionCompatibilityMap = {
  workforce: {
    preferredKeys: ['operatorRead', 'operatorManage', 'operatorDocumentManage', 'operatorStatusManage'],
    legacyResourceCode: 'driver',
  },
  assets: {
    preferredKeys: ['assetRead', 'assetManage', 'assetMaintenanceManage', 'assetStatusManage'],
    legacyResourceCode: 'fleet',
  },
  operations: {
    preferredKeys: ['operationsRead', 'operationsManage', 'operationsAssignmentManage', 'operationsRunManage', 'operationsIssueManage'],
    legacyResourceCode: 'dispatch',
  },
} as const;
