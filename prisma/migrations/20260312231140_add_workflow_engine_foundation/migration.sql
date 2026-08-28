-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "TaskActionType" AS ENUM ('APPROVE', 'REJECT', 'SEND_BACK', 'COMMENT', 'ASSIGN', 'ESCALATE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('ROLE_ESCALATION', 'USER_NOTIFICATION', 'SLA_BREACH');

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "moduleKey" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "taskKey" VARCHAR(100) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeUserId" UUID,
    "assigneeRoleCode" VARCHAR(80),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_actions" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "actionType" "TaskActionType" NOT NULL,
    "actionLabel" VARCHAR(100) NOT NULL,
    "actorUserId" UUID NOT NULL,
    "comment" VARCHAR(1000),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" UUID NOT NULL,
    "workflowDefinitionId" UUID NOT NULL,
    "taskKey" VARCHAR(100) NOT NULL,
    "escalationType" "EscalationType" NOT NULL,
    "thresholdMinutes" INTEGER NOT NULL,
    "targetRoleCode" VARCHAR(80),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_definitions_moduleKey_isActive_idx" ON "workflow_definitions"("moduleKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");

-- CreateIndex
CREATE INDEX "workflow_instances_definitionId_status_idx" ON "workflow_instances"("definitionId", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_organizationId_status_idx" ON "workflow_instances"("organizationId", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_entityType_entityId_idx" ON "workflow_instances"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "workflow_instances_createdByUserId_idx" ON "workflow_instances"("createdByUserId");

-- CreateIndex
CREATE INDEX "workflow_tasks_instanceId_status_idx" ON "workflow_tasks"("instanceId", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_assigneeUserId_status_idx" ON "workflow_tasks"("assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_assigneeRoleCode_status_idx" ON "workflow_tasks"("assigneeRoleCode", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_dueAt_idx" ON "workflow_tasks"("dueAt");

-- CreateIndex
CREATE INDEX "task_actions_taskId_createdAt_idx" ON "task_actions"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "task_actions_actorUserId_idx" ON "task_actions"("actorUserId");

-- CreateIndex
CREATE INDEX "escalation_rules_workflowDefinitionId_taskKey_isActive_idx" ON "escalation_rules"("workflowDefinitionId", "taskKey", "isActive");

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_actions" ADD CONSTRAINT "task_actions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_actions" ADD CONSTRAINT "task_actions_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
