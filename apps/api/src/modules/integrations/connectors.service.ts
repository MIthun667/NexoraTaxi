import { ConnectorAuthType, ConnectorInstanceStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { ConnectorsRepository } from './connectors.repository';
import { ConnectorAuthService } from './connector-auth.service';

@Injectable()
export class ConnectorsService {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorAuthService: ConnectorAuthService,
  ) {}

  listDefinitions() {
    return this.connectorsRepository.listDefinitions();
  }

  listInstances(organizationId: string) {
    return this.connectorsRepository.listInstances(organizationId);
  }

  async createInstance(input: {
    organizationId: string;
    connectorDefinitionId: string;
    displayName: string;
    configuration?: Record<string, unknown> | null;
    createdByUserId?: string | null;
    credential?: {
      type: ConnectorAuthType;
      secret: string;
      expiresAt?: Date | null;
    } | null;
  }) {
    const instance = await this.connectorsRepository.createInstance({
      organizationId: input.organizationId,
      connectorDefinitionId: input.connectorDefinitionId,
      displayName: input.displayName,
      status: ConnectorInstanceStatus.ACTIVE,
      configuration: (input.configuration ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      createdByUserId: input.createdByUserId ?? null,
    });

    if (input.credential) {
      await this.connectorsRepository.createCredential({
        connectorInstanceId: instance.id,
        credentialType: input.credential.type,
        encryptedSecret: this.connectorAuthService.encryptSecret(input.credential.secret),
        expiresAt: input.credential.expiresAt ?? null,
      });
    }

    return this.connectorsRepository.findInstanceById(instance.id);
  }
}
