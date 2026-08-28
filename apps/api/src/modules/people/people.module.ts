import { Module } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

// People is the canonical human-actor aggregation surface.
// DriversModule remains imported only so legacy compatibility reads can be merged safely.
@Module({
  imports: [WorkforceModule, DriversModule],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
