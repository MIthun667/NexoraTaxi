import { Injectable, NotFoundException } from '@nestjs/common';

import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { DriversService } from '../drivers/drivers.service';
import { DriverResponse } from '../drivers/mappers/driver.mapper';
import { QueryPeopleDto } from './dto/query-people.dto';
import { Person } from './interfaces/person.interface';
import { WorkforceQueryService } from '../workforce/workforce-query.service';
import { WorkforceDetailPresenter } from '../workforce/presenters/workforce-detail.presenter';
import { WorkforceListItemPresenter } from '../workforce/presenters/workforce-list-item.presenter';

@Injectable()
export class PeopleService {
  constructor(
    private readonly workforceQueryService: WorkforceQueryService,
    private readonly driversService: DriversService,
  ) {}

  async listPeople(query: QueryPeopleDto) {
    const { page, limit, skip } = resolvePagination(query);
    const [workforcePeople, driverPeople] = await Promise.all([
      query.sourceModule === 'drivers'
        ? Promise.resolve<Person[]>([])
        : this.listWorkforcePeople(query),
      query.sourceModule === 'workforce'
        ? Promise.resolve<Person[]>([])
        : this.listDriverPeople(query),
    ]);

    const merged = [...workforcePeople, ...driverPeople].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
    const paged = merged.slice(skip, skip + limit);

    return buildPaginatedResponse(
      'People retrieved successfully.',
      paged,
      buildPaginationMeta({ page, limit, total: merged.length }),
    );
  }

  async getPersonById(personId: string) {
    const workforcePerson = await this.tryGetWorkforcePerson(personId);
    if (workforcePerson) {
      return buildSuccessResponse('Person retrieved successfully.', workforcePerson);
    }

    const driverPerson = await this.tryGetDriverPerson(personId);
    if (driverPerson) {
      return buildSuccessResponse('Person retrieved successfully.', driverPerson);
    }

    throw new NotFoundException('Person not found.');
  }

  mapWorkforceRecordToPerson(workforceRecord: WorkforceListItemPresenter | WorkforceDetailPresenter): Person {
    return {
      id: workforceRecord.id,
      organizationId: workforceRecord.organizationId,
      displayName:
        workforceRecord.displayName ??
        `${workforceRecord.firstName} ${workforceRecord.lastName}`.trim(),
      roleCategory: this.mapWorkforceRoleCategory(workforceRecord),
      status: workforceRecord.operationalStatus,
      sourceModule: 'workforce',
    };
  }

  mapDriverRecordToPerson(driverRecord: DriverResponse): Person {
    return {
      id: driverRecord.id,
      organizationId: driverRecord.organizationId,
      displayName: `${driverRecord.firstName} ${driverRecord.lastName}`.trim(),
      // TODO: Keep the legacy role label for compatibility now; migrate toward
      // person/worker-facing categories once driver-specific contracts are deprecated.
      roleCategory: 'driver',
      status: driverRecord.operationalStatus,
      sourceModule: 'drivers',
    };
  }

  private async listWorkforcePeople(query: QueryPeopleDto): Promise<Person[]> {
    const workforceResponse = await this.workforceQueryService.listWorkforceMembers({
      page: 1,
      limit: 100,
      search: query.search,
      organizationId: query.organizationId,
    });

    return workforceResponse.data.map((record) => this.mapWorkforceRecordToPerson(record));
  }

  private async listDriverPeople(query: QueryPeopleDto): Promise<Person[]> {
    const driversResponse = await this.driversService.findAll({
      page: 1,
      limit: 100,
      search: query.search,
      organizationId: query.organizationId,
    });

    return driversResponse.data.map((record) => this.mapDriverRecordToPerson(record));
  }

  private async tryGetWorkforcePerson(personId: string): Promise<Person | null> {
    try {
      const response = await this.workforceQueryService.getWorkforceMemberDetail(personId);
      return this.mapWorkforceRecordToPerson(response.data);
    } catch {
      return null;
    }
  }

  private async tryGetDriverPerson(personId: string): Promise<Person | null> {
    try {
      const response = await this.driversService.findOne(personId);
      return this.mapDriverRecordToPerson(response.data);
    } catch {
      return null;
    }
  }

  private mapWorkforceRoleCategory(
    workforceRecord: WorkforceListItemPresenter | WorkforceDetailPresenter,
  ): Person['roleCategory'] {
    // TODO: Replace source-specific role inference once legacy driver reads are retired
    // and the people/workforce abstraction becomes the canonical human-actor surface.
    if (workforceRecord.workerType === 'EMPLOYEE') {
      return 'employee';
    }

    if (workforceRecord.workerType === 'CONTRACTOR') {
      return 'operator';
    }

    return 'worker';
  }
}
