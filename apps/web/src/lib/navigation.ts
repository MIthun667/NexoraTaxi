import type { Route } from 'next';
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Flag,
  GitBranch,
  LayoutDashboard,
  LucideIcon,
  Package,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';

export type NavigationItem = {
  section: 'Main' | 'Actions' | 'Commerce' | 'System';
  title: string;
  href: Route;
  icon: LucideIcon;
  requiredPermissions?: string[];
  children?: Array<{
    title: string;
    href: Route;
    requiredPermissions?: string[];
  }>;
};

export const navigation: NavigationItem[] = [
  {
    section: 'Main',
    title: 'Portfolio',
    href: '/shopify/portfolio',
    icon: Building2,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Strategy',
    href: '/shopify/strategy',
    icon: Flag,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Reviews',
    href: '/shopify/reviews',
    icon: FileText,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Overview',
    href: '/shopify/overview',
    icon: LayoutDashboard,
    requiredPermissions: ['analytics.read', 'intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Daily Brief',
    href: '/shopify/executive-brief',
    icon: FileText,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Performance',
    href: '/shopify/store-performance',
    icon: BarChart3,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Main',
    title: 'Signals',
    href: '/shopify/signals',
    icon: Activity,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Actions',
    title: 'Scenarios',
    href: '/shopify/scenarios',
    icon: GitBranch,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Actions',
    title: 'Opportunities',
    href: '/shopify/recommendations',
    icon: Sparkles,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Actions',
    title: 'Actions',
    href: '/shopify/action-proposals',
    icon: ClipboardCheck,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Actions',
    title: 'Outcomes',
    href: '/shopify/outcomes',
    icon: TrendingUp,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Commerce',
    title: 'Catalog',
    href: '/shopify/catalog-intelligence',
    icon: Package,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Commerce',
    title: 'Customers',
    href: '/shopify/customer-intelligence',
    icon: Users,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Commerce',
    title: 'Payments',
    href: '/shopify/finance-intelligence',
    icon: CreditCard,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'Commerce',
    title: 'Stores',
    href: '/shopify/connected-stores' as Route,
    icon: Store,
    requiredPermissions: ['intelligence.read', 'organization.manage'],
  },
  {
    section: 'System',
    title: 'Data Status',
    href: '/shopify/sync-health' as Route,
    icon: ShieldCheck,
    requiredPermissions: ['intelligence.read'],
  },
  {
    section: 'System',
    title: 'Settings',
    href: '/settings',
    icon: Settings2,
    requiredPermissions: ['role.read', 'permission.read', 'user.read', 'organization.read'],
    children: [
      { title: 'Settings', href: '/settings', requiredPermissions: ['organization.read'] },
      { title: 'Access & Roles', href: '/settings/access' as Route, requiredPermissions: ['role.read', 'permission.read', 'user.read'] },
      { title: 'Audit & Activity', href: '/settings/audit-activity' as Route, requiredPermissions: ['approval-queue.read', 'intelligence.read'] },
    ],
  },
];

/**
 * Canonical permission labels used by navigation and page gating.
 *
 * Prefer operator/asset/operations keys for all new work. Legacy
 * driver/fleet/dispatch keys remain as compatibility aliases only.
 */
export const permissionLabels = {
  operatorManage: 'driver.manage',
  operatorDocumentManage: 'driver.document.manage',
  operatorStatusManage: 'driver.status.manage',
  assetManage: 'fleet.manage',
  assetMaintenanceManage: 'fleet.schedule',
  assetStatusManage: 'fleet.manage',
  operationsManage: 'dispatch.intervene',
  operationsAssignmentManage: 'dispatch.intervene',
  operationsRunManage: 'dispatch.manage',
  operationsIssueManage: 'dispatch.intervene',
  approvalCreate: 'approval-queue.manage',
  approvalAct: 'approval-queue.approve',
  dashboardRead: 'analytics.read',
  settingsRead: 'role.read',
  securityRead: 'permission.read',
  userRead: 'user.read',
  workflowRead: 'workflow.read',
  workflowManage: 'workflow.manage',
  workflowAct: 'workflow.execute',
  organizationRead: 'organization.read',
  organizationManage: 'organization.manage',
  employeeRead: 'employee.read',
  employeeManage: 'employee.manage',
  departmentRead: 'department.read',
  departmentManage: 'department.manage',
  positionRead: 'position.read',
  positionManage: 'position.manage',
  operationsRead: 'dispatch.read',
  approvalRead: 'approval-queue.read',
  dashboardAlertsRead: 'analytics.read',
  dashboardAnalyticsRead: 'analytics.read',
  agentRead: 'intelligence.read',
  agentRun: 'intelligence.execute',
  agentReview: 'intelligence.review',
  intelligenceGenerate: 'intelligence.execute',
  notificationRead: 'user.read',
  notificationManage: 'user.read',
  commerceRead: 'intelligence.read',
  commerceManage: 'organization.manage',
  accessManage: 'role.read',
  auditRead: 'approval-queue.read',
  financeRead: 'intelligence.read',
  integrationRead: 'intelligence.read',
};

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessNavigationItem(
  item: NavigationItem | NonNullable<NavigationItem['children']>[number],
  hasPermission: (permission: string) => boolean,
) {
  if (!item.requiredPermissions?.length) {
    return true;
  }

  return item.requiredPermissions.some((permission) => hasPermission(permission));
}

export function getNavigationTrail(pathname: string) {
  if (pathname === '/ai/runs') {
    return ['Agent Runs'];
  }

  if (pathname.startsWith('/ai/runs/')) {
    return ['Agent Run'];
  }

  for (const item of navigation) {
    if (item.children) {
      for (const child of item.children) {
        if (matchesPath(pathname, child.href)) {
          return [item.title, child.title];
        }
      }
    }

    if (matchesPath(pathname, item.href)) {
      return [item.title];
    }
  }

  return ['Nexora Commerce'];
}
