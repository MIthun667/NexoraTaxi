import { Controller, Get, Param, Query } from '@nestjs/common';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryPeopleDto } from './dto/query-people.dto';
import { PeopleService } from './people.service';

@Controller('people')
@Permissions(PlatformPermissions.operatorRead)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  list(@Query() query: QueryPeopleDto) {
    return this.peopleService.listPeople(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.peopleService.getPersonById(id);
  }
}
