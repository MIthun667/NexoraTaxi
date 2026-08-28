import {
  DepartmentStatus,
  EmploymentStatus,
  OrganizationStatus,
  PositionStatus,
  UserStatus,
} from '@prisma/client';

/**
 * @deprecated Legacy taxi-era seed catalog kept only for deterministic legacy utilities
 * and development password standardization. Active demo seeding now runs through
 * `prisma/seed.ts` and the multi-vertical packs under `prisma/seeds/**`.
 *
 * Do not use this catalog for new demo tenants, product surfaces, or platform vocabulary.
 */
export const SEED_NAMESPACE = 'nexora-taxi-seed-v1';
export const DEVELOPMENT_PASSWORD_HASH =
  '$2b$10$5MHiKZngeNjNV1ehncgcrOnbKldwVFazxCSxFc0TLKKTgjubJNrKC';

export const ORGANIZATION_SEED = {
  idSeed: 'organization:nexora-taxi',
  name: 'Nexora Taxi',
  slug: 'nexora-taxi',
  status: OrganizationStatus.ACTIVE,
} as const;

export const DEPARTMENT_SEEDS = [
  {
    code: 'OPS-CTRL',
    name: 'Operations Control',
    description:
      'Coordinates operational command coverage, escalation handling, and network performance oversight.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'DRV-SCS',
    name: 'Driver Success',
    description:
      'Supports driver engagement, onboarding readiness, and operating partner retention programs.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'FLT-OVR',
    name: 'Fleet Oversight',
    description:
      'Maintains fleet governance, asset readiness monitoring, and vehicle compliance controls.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'CST-EXP',
    name: 'Customer Experience',
    description:
      'Leads rider support operations, service recovery workflows, and quality improvement analysis.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'FIN-CTL',
    name: 'Finance Control',
    description:
      'Owns operating financial controls, revenue assurance, and payment reconciliation processes.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'HR-POPS',
    name: 'HR & People Operations',
    description:
      'Runs workforce planning, people operations governance, and talent administration services.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'SFT-CMP',
    name: 'Safety & Compliance',
    description:
      'Monitors operational risk, regulatory readiness, safety investigations, and control execution.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'DSP-CRD',
    name: 'Dispatch Coordination',
    description:
      'Supervises dispatch desk activity, routing stability, and service allocation performance.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'STR-GRW',
    name: 'Strategic Growth',
    description:
      'Drives commercial growth planning, market intelligence, and network expansion initiatives.',
    status: DepartmentStatus.ACTIVE,
  },
  {
    code: 'TEC-OPS',
    name: 'Technology Operations',
    description:
      'Supports platform operations, systems reliability, automation readiness, and operational tooling.',
    status: DepartmentStatus.INACTIVE,
  },
] as const;

export const POSITION_SEEDS = [
  { code: 'COO', title: 'Chief Operations Officer', departmentCode: null, gradeLevel: 'Executive', status: PositionStatus.ACTIVE, description: 'Leads enterprise-wide transportation operations and execution strategy.' },
  { code: 'OPS-DIR', title: 'Operations Director', departmentCode: 'OPS-CTRL', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Oversees network operations control performance and escalation governance.' },
  { code: 'OPS-SUP', title: 'Operations Supervisor', departmentCode: 'OPS-CTRL', gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Runs command-floor supervision, shift coordination, and service continuity checks.' },
  { code: 'OPS-ANA', title: 'Service Performance Analyst', departmentCode: 'OPS-CTRL', gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Tracks operational KPIs, service-level drift, and recovery opportunities.' },
  { code: 'DRV-DIR', title: 'Driver Success Director', departmentCode: 'DRV-SCS', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Leads driver retention, engagement, and partner success programs.' },
  { code: 'DRV-MGR', title: 'Driver Success Manager', departmentCode: 'DRV-SCS', gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Owns driver lifecycle management and coaching outcomes.' },
  { code: 'DRV-SPC', title: 'Driver Success Specialist', departmentCode: 'DRV-SCS', gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Supports onboarding quality, partner experience, and case resolution.' },
  { code: 'FLT-DIR', title: 'Fleet Oversight Director', departmentCode: 'FLT-OVR', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Directs vehicle readiness, oversight planning, and fleet governance.' },
  { code: 'FLT-CMP', title: 'Fleet Compliance Officer', departmentCode: 'FLT-OVR', gradeLevel: 'Officer', status: PositionStatus.ACTIVE, description: 'Monitors fleet compliance obligations and exception remediation.' },
  { code: 'FLT-SCH', title: 'Fleet Scheduling Coordinator', departmentCode: 'FLT-OVR', gradeLevel: 'Coordinator', status: PositionStatus.ACTIVE, description: 'Coordinates fleet service windows, asset rotations, and availability planning.' },
  { code: 'CEX-MGR', title: 'Customer Experience Manager', departmentCode: 'CST-EXP', gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Leads service quality escalation handling and support performance programs.' },
  { code: 'CEX-SPC', title: 'Customer Experience Specialist', departmentCode: 'CST-EXP', gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Executes rider support operations and service recovery workflows.' },
  { code: 'CEX-QA', title: 'Service Quality Analyst', departmentCode: 'CST-EXP', gradeLevel: 'Analyst', status: PositionStatus.ACTIVE, description: 'Reviews support outcomes, complaint trends, and quality interventions.' },
  { code: 'FIN-DIR', title: 'Finance Controller', departmentCode: 'FIN-CTL', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Owns operational finance governance, assurance, and control execution.' },
  { code: 'FIN-ANA', title: 'Finance Operations Analyst', departmentCode: 'FIN-CTL', gradeLevel: 'Analyst', status: PositionStatus.ACTIVE, description: 'Supports payment controls, reconciliation, and reporting operations.' },
  { code: 'FIN-RSK', title: 'Revenue Assurance Specialist', departmentCode: 'FIN-CTL', gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Investigates billing anomalies and protects transaction integrity.' },
  { code: 'HR-DIR', title: 'People Operations Director', departmentCode: 'HR-POPS', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Leads people operations, workforce governance, and talent processes.' },
  { code: 'HR-BP', title: 'HR Business Partner', departmentCode: 'HR-POPS', gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Partners with operating leaders on staffing, performance, and people risk.' },
  { code: 'HR-CRD', title: 'Talent Operations Coordinator', departmentCode: 'HR-POPS', gradeLevel: 'Coordinator', status: PositionStatus.ACTIVE, description: 'Coordinates talent operations, onboarding readiness, and records management.' },
  { code: 'SFT-DIR', title: 'Safety & Compliance Director', departmentCode: 'SFT-CMP', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Directs safety governance, investigations, and regulatory execution.' },
  { code: 'SFT-OFR', title: 'Safety Monitoring Officer', departmentCode: 'SFT-CMP', gradeLevel: 'Officer', status: PositionStatus.ACTIVE, description: 'Monitors safety incidents, alerts, and remediation tasks.' },
  { code: 'CMP-SPC', title: 'Compliance Review Specialist', departmentCode: 'SFT-CMP', gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Executes compliance reviews, evidence checks, and control validation.' },
  { code: 'DSP-DIR', title: 'Dispatch Operations Director', departmentCode: 'DSP-CRD', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Leads dispatch network stability and allocation control performance.' },
  { code: 'DSP-LDR', title: 'Dispatch Operations Lead', departmentCode: 'DSP-CRD', gradeLevel: 'Lead', status: PositionStatus.ACTIVE, description: 'Coordinates dispatch desk workflows and service assignment execution.' },
  { code: 'DSP-SPV', title: 'Dispatch Supervisor', departmentCode: 'DSP-CRD', gradeLevel: 'Supervisor', status: PositionStatus.ACTIVE, description: 'Supervises dispatch shifts, live interventions, and exception response.' },
  { code: 'DSP-ANA', title: 'Routing Performance Analyst', departmentCode: 'DSP-CRD', gradeLevel: 'Analyst', status: PositionStatus.ACTIVE, description: 'Analyzes routing performance, demand balancing, and dispatch efficiency.' },
  { code: 'GTH-DIR', title: 'Strategic Growth Director', departmentCode: 'STR-GRW', gradeLevel: 'Director', status: PositionStatus.ACTIVE, description: 'Shapes market strategy, network expansion, and growth execution planning.' },
  { code: 'GTH-MGR', title: 'Market Expansion Manager', departmentCode: 'STR-GRW', gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Leads regional launch preparation and growth initiative delivery.' },
  { code: 'GTH-INT', title: 'Commercial Intelligence Analyst', departmentCode: 'STR-GRW', gradeLevel: 'Analyst', status: PositionStatus.ACTIVE, description: 'Analyzes growth signals, partner behavior, and market performance.' },
  { code: 'TEC-DIR', title: 'Technology Operations Director', departmentCode: 'TEC-OPS', gradeLevel: 'Director', status: PositionStatus.INACTIVE, description: 'Owns technology operations governance and platform resilience planning.' },
  { code: 'TEC-SRE', title: 'Platform Reliability Engineer', departmentCode: 'TEC-OPS', gradeLevel: 'Engineer', status: PositionStatus.ACTIVE, description: 'Supports platform reliability, operational tooling, and runtime readiness.' },
  { code: 'TEC-AUT', title: 'Automation Operations Specialist', departmentCode: 'TEC-OPS', gradeLevel: 'Specialist', status: PositionStatus.DRAFT, description: 'Designs operational automation workflows and tooling efficiency improvements.' },
  { code: 'TAL-OPS', title: 'Talent Acquisition Operations Lead', departmentCode: 'HR-POPS', gradeLevel: 'Lead', status: PositionStatus.ACTIVE, description: 'Coordinates structured hiring operations and recruitment service delivery.' },
  { code: 'ANA-SPC', title: 'Analytics Specialist', departmentCode: null, gradeLevel: 'Specialist', status: PositionStatus.ACTIVE, description: 'Builds operational reporting, insights delivery, and decision support outputs.' },
  { code: 'WF-ADM', title: 'Workflow Governance Manager', departmentCode: null, gradeLevel: 'Manager', status: PositionStatus.ACTIVE, description: 'Owns workflow governance standards, approval routing, and control design.' },
] as const;

export const ROLE_SEEDS = [
  { code: 'PLATFORM_ADMIN', name: 'Platform Administrator', description: 'Owns platform-wide administrative governance and access control.', priority: 20 },
  { code: 'EXEC_OPERATIONS', name: 'Executive Operations Lead', description: 'Provides senior operational leadership across the platform.', priority: 19 },
  { code: 'OPS_MANAGER', name: 'Operations Manager', description: 'Leads operations control and cross-functional operational execution.', priority: 18 },
  { code: 'DISPATCH_SUPERVISOR', name: 'Dispatch Supervisor', description: 'Supervises dispatch operations and routing performance.', priority: 17 },
  { code: 'DRIVER_SUCCESS_LEAD', name: 'Driver Success Lead', description: 'Leads driver operations, onboarding, and support programs.', priority: 16 },
  { code: 'FLEET_COMPLIANCE_MANAGER', name: 'Fleet Compliance Manager', description: 'Leads fleet control execution and compliance governance.', priority: 15 },
  { code: 'FINANCE_CONTROLLER', name: 'Finance Controller', description: 'Owns financial control, assurance, and reconciliation governance.', priority: 14 },
  { code: 'HR_MANAGER', name: 'HR Manager', description: 'Leads people operations, employee administration, and workforce governance.', priority: 13 },
  { code: 'SAFETY_COMPLIANCE_OFFICER', name: 'Safety Compliance Officer', description: 'Executes safety controls, incident review, and compliance monitoring.', priority: 12 },
  { code: 'SUPPORT_MANAGER', name: 'Support Manager', description: 'Leads customer support operations and service recovery standards.', priority: 11 },
  { code: 'ANALYTICS_SPECIALIST', name: 'Analytics Specialist', description: 'Maintains reporting pipelines, dashboards, and operational insights.', priority: 10 },
  { code: 'WORKFLOW_ADMIN', name: 'Workflow Administrator', description: 'Configures workflows, approvals, and routing controls.', priority: 9 },
  { code: 'APPROVAL_REVIEWER', name: 'Approval Reviewer', description: 'Reviews operational approvals and escalated decisions.', priority: 8 },
  { code: 'DISPATCH_ANALYST', name: 'Dispatch Analyst', description: 'Monitors dispatch health and analyzes routing performance.', priority: 7 },
  { code: 'FLEET_AUDITOR', name: 'Fleet Auditor', description: 'Audits fleet controls, records, and operational readiness.', priority: 6 },
  { code: 'PEOPLE_OPERATIONS_COORDINATOR', name: 'People Operations Coordinator', description: 'Supports workforce operations and employee administration workflows.', priority: 5 },
  { code: 'FINANCE_ANALYST', name: 'Finance Analyst', description: 'Supports operational finance reviews and reporting controls.', priority: 4 },
  { code: 'SERVICE_PERFORMANCE_ANALYST', name: 'Service Performance Analyst', description: 'Tracks service performance and operational quality trends.', priority: 3 },
  { code: 'INTELLIGENCE_OPERATOR', name: 'Intelligence Operator', description: 'Reviews operational intelligence outputs and recommendations.', priority: 2 },
  { code: 'READ_ONLY_AUDITOR', name: 'Read-Only Auditor', description: 'Has read-oriented platform access for audit and assurance activities.', priority: 1 },
] as const;

export const ROLE_PERMISSION_TARGET = 974;
export const USER_ROLE_TARGET = 500;

export const PERMISSION_RESOURCES = [
  { resource: 'organization', label: 'Organization', actions: ['read', 'manage', 'configure', 'export'] },
  { resource: 'department', label: 'Department', actions: ['read', 'manage', 'assign', 'export'] },
  { resource: 'position', label: 'Position', actions: ['read', 'manage', 'assign', 'export'] },
  { resource: 'employee', label: 'Employee', actions: ['read', 'manage', 'onboard', 'export'] },
  { resource: 'user', label: 'User Account', actions: ['read', 'manage', 'invite', 'lock'] },
  { resource: 'role', label: 'Role', actions: ['read', 'manage', 'assign', 'export'] },
  { resource: 'permission', label: 'Permission', actions: ['read', 'manage', 'assign', 'export'] },
  { resource: 'workflow', label: 'Workflow', actions: ['read', 'manage', 'approve', 'execute'] },
  { resource: 'approval-queue', label: 'Approval Queue', actions: ['read', 'manage', 'approve', 'escalate'] },
  { resource: 'driver', label: 'Driver', actions: ['read', 'manage', 'document.manage', 'status.manage'] },
  { resource: 'dispatch', label: 'Dispatch', actions: ['read', 'manage', 'monitor', 'intervene'] },
  { resource: 'fleet', label: 'Fleet', actions: ['read', 'manage', 'audit', 'schedule'] },
  { resource: 'compliance', label: 'Compliance', actions: ['read', 'manage', 'review', 'resolve'] },
  { resource: 'support-ticket', label: 'Support Ticket', actions: ['read', 'manage', 'assign', 'resolve'] },
  { resource: 'analytics', label: 'Analytics', actions: ['read', 'manage', 'export', 'configure'] },
  { resource: 'intelligence', label: 'Intelligence', actions: ['read', 'manage', 'review', 'execute'] },
] as const;

export const ROLE_PERMISSION_PROFILES: Record<
  (typeof ROLE_SEEDS)[number]['code'],
  { resources: string[]; actions: string[] }
> = {
  PLATFORM_ADMIN: { resources: ['*'], actions: ['*'] },
  EXEC_OPERATIONS: {
    resources: ['organization', 'department', 'position', 'employee', 'user', 'workflow', 'approval-queue', 'driver', 'dispatch', 'fleet', 'compliance', 'analytics', 'intelligence'],
    actions: ['read', 'manage', 'configure', 'export', 'assign', 'approve', 'execute', 'monitor', 'intervene', 'review', 'resolve', 'invite', 'lock', 'onboard', 'schedule', 'escalate'],
  },
  OPS_MANAGER: {
    resources: ['organization', 'department', 'position', 'employee', 'workflow', 'approval-queue', 'driver', 'dispatch', 'fleet', 'analytics', 'support-ticket', 'compliance'],
    actions: ['read', 'manage', 'export', 'assign', 'approve', 'monitor', 'intervene', 'review', 'resolve', 'onboard'],
  },
  DISPATCH_SUPERVISOR: {
    resources: ['dispatch', 'workflow', 'approval-queue', 'driver', 'employee', 'department', 'analytics', 'support-ticket'],
    actions: ['read', 'manage', 'monitor', 'intervene', 'approve', 'assign', 'export'],
  },
  DRIVER_SUCCESS_LEAD: {
    resources: ['employee', 'department', 'position', 'workflow', 'approval-queue', 'driver', 'support-ticket', 'analytics'],
    actions: ['read', 'manage', 'assign', 'approve', 'export', 'onboard', 'resolve'],
  },
  FLEET_COMPLIANCE_MANAGER: {
    resources: ['fleet', 'compliance', 'workflow', 'approval-queue', 'driver', 'employee', 'analytics'],
    actions: ['read', 'manage', 'audit', 'schedule', 'review', 'resolve', 'approve', 'export'],
  },
  FINANCE_CONTROLLER: {
    resources: ['organization', 'employee', 'workflow', 'approval-queue', 'driver', 'analytics', 'support-ticket'],
    actions: ['read', 'manage', 'approve', 'export', 'review', 'resolve'],
  },
  HR_MANAGER: {
    resources: ['employee', 'department', 'position', 'user', 'workflow', 'approval-queue', 'driver', 'analytics'],
    actions: ['read', 'manage', 'assign', 'invite', 'lock', 'approve', 'export', 'onboard'],
  },
  SAFETY_COMPLIANCE_OFFICER: {
    resources: ['compliance', 'fleet', 'employee', 'workflow', 'approval-queue', 'driver', 'analytics'],
    actions: ['read', 'manage', 'review', 'resolve', 'approve', 'audit', 'export'],
  },
  SUPPORT_MANAGER: {
    resources: ['support-ticket', 'employee', 'department', 'analytics', 'workflow'],
    actions: ['read', 'manage', 'assign', 'resolve', 'export', 'approve'],
  },
  ANALYTICS_SPECIALIST: {
    resources: ['analytics', 'organization', 'department', 'position', 'employee', 'dispatch', 'fleet', 'compliance', 'support-ticket', 'intelligence'],
    actions: ['read', 'export', 'configure', 'review'],
  },
  WORKFLOW_ADMIN: {
    resources: ['workflow', 'approval-queue', 'driver', 'role', 'permission', 'department', 'position'],
    actions: ['read', 'manage', 'assign', 'approve', 'execute', 'escalate', 'export'],
  },
  APPROVAL_REVIEWER: {
    resources: ['approval-queue', 'workflow', 'driver', 'employee', 'department', 'position'],
    actions: ['read', 'approve', 'escalate', 'review'],
  },
  DISPATCH_ANALYST: {
    resources: ['dispatch', 'analytics', 'organization', 'support-ticket'],
    actions: ['read', 'monitor', 'export', 'review'],
  },
  FLEET_AUDITOR: {
    resources: ['fleet', 'compliance', 'analytics', 'organization'],
    actions: ['read', 'audit', 'review', 'export'],
  },
  PEOPLE_OPERATIONS_COORDINATOR: {
    resources: ['employee', 'department', 'position', 'user', 'workflow'],
    actions: ['read', 'assign', 'invite', 'onboard', 'export'],
  },
  FINANCE_ANALYST: {
    resources: ['analytics', 'organization', 'employee', 'support-ticket'],
    actions: ['read', 'export', 'review'],
  },
  SERVICE_PERFORMANCE_ANALYST: {
    resources: ['analytics', 'dispatch', 'support-ticket', 'organization', 'department'],
    actions: ['read', 'export', 'review', 'monitor'],
  },
  INTELLIGENCE_OPERATOR: {
    resources: ['intelligence', 'analytics', 'workflow', 'approval-queue'],
    actions: ['read', 'manage', 'review', 'execute', 'export'],
  },
  READ_ONLY_AUDITOR: {
    resources: ['organization', 'department', 'position', 'employee', 'user', 'role', 'permission', 'workflow', 'approval-queue', 'driver', 'dispatch', 'fleet', 'compliance', 'support-ticket', 'analytics', 'intelligence'],
    actions: ['read', 'export', 'review', 'monitor'],
  },
};

export const SERVICE_USER_SEEDS = [
  { firstName: 'Amira', lastName: 'Rahman', email: 'platform.admin@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Khalid', lastName: 'Morshed', email: 'executive.ops@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Sadia', lastName: 'Islam', email: 'ops.control@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Tanvir', lastName: 'Hasan', email: 'dispatch.supervisor@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Maliha', lastName: 'Sarker', email: 'driver.success@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Arefin', lastName: 'Karim', email: 'fleet.compliance@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Sharmeen', lastName: 'Akter', email: 'finance.control@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Rafi', lastName: 'Noman', email: 'hr.operations@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Farzana', lastName: 'Kabir', email: 'safety.compliance@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Ishraq', lastName: 'Ahmed', email: 'support.manager@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Nafisa', lastName: 'Chowdhury', email: 'analytics.specialist@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Sabbir', lastName: 'Uddin', email: 'workflow.admin@nexorataxi.com', status: UserStatus.ACTIVE },
  { firstName: 'Muntasir', lastName: 'Ali', email: 'approval.reviewer@nexorataxi.com', status: UserStatus.INVITED },
  { firstName: 'Raisa', lastName: 'Tasnim', email: 'intelligence.operator@nexorataxi.com', status: UserStatus.INVITED },
  { firstName: 'Jahid', lastName: 'Hossain', email: 'audit.viewer@nexorataxi.com', status: UserStatus.LOCKED },
] as const;

export const FIRST_NAMES = [
  'Aarav', 'Aaliyah', 'Amira', 'Anika', 'Arefin', 'Arman', 'Ayesha', 'Bari', 'Bushra', 'Danish',
  'Elina', 'Farhan', 'Farzana', 'Fariha', 'Fayez', 'Habib', 'Hadia', 'Imran', 'Inaya', 'Ishraq',
  'Jannat', 'Jasim', 'Jui', 'Kamal', 'Karim', 'Kawsar', 'Labib', 'Lamia', 'Lubna', 'Mahin',
  'Mahira', 'Maisha', 'Mehedi', 'Mim', 'Mira', 'Mizan', 'Nabila', 'Nadim', 'Nafisa', 'Naim',
  'Nasrin', 'Nazia', 'Niloy', 'Nusrat', 'Priya', 'Rafi', 'Raisa', 'Rakib', 'Rashid', 'Sabbir',
  'Sadia', 'Saif', 'Salma', 'Samira', 'Shakil', 'Sharmeen', 'Sharif', 'Sohan', 'Tahmid', 'Tahsin',
  'Tanvir', 'Tania', 'Tasnim', 'Tawhid', 'Waseem', 'Yasir', 'Yasmin', 'Zahin', 'Zara', 'Zubair',
];

export const LAST_NAMES = [
  'Ahmed', 'Akter', 'Ali', 'Anwar', 'Arefin', 'Bashar', 'Begum', 'Chowdhury', 'Das', 'Farook',
  'Habib', 'Haque', 'Hasan', 'Hossain', 'Huq', 'Islam', 'Jahan', 'Jamil', 'Kabir', 'Karim',
  'Khan', 'Miah', 'Mollah', 'Mondal', 'Morshed', 'Noman', 'Rahman', 'Rashid', 'Sarker', 'Shikder',
  'Siddique', 'Sultana', 'Talukder', 'Tasnim', 'Uddin', 'Yasmin',
];

export const DEPARTMENT_WORKFORCE_WEIGHTS = [
  'DSP-CRD', 'DSP-CRD', 'DSP-CRD', 'OPS-CTRL', 'OPS-CTRL', 'DRV-SCS', 'DRV-SCS', 'FLT-OVR',
  'CST-EXP', 'FIN-CTL', 'HR-POPS', 'SFT-CMP', 'STR-GRW', 'TEC-OPS',
] as const;

export const ACTIVE_EMPLOYMENT_STATUSES = [
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ONBOARDING,
  EmploymentStatus.PROBATION,
  EmploymentStatus.LEAVE_OF_ABSENCE,
] as const;
