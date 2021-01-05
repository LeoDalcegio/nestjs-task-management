import { PipeTransform, BadRequestException } from '@nestjs/common';
import { TaskStatus } from 'src/common/enum/TaskStatus';

export class TaskStatusValidatonPipe implements PipeTransform {
  readonly allowedStatuses = [
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.DONE,
  ];

  private isStatusValid(status: any) {
    const idx = this.allowedStatuses.indexOf(status);

    return idx != -1;
  }

  transform(value: any) {
    if (!value) {
      throw new BadRequestException(`"${value}" is an invalid value`);
    }

    value = value.toUpperCase();

    if (!this.isStatusValid(value)) {
      throw new BadRequestException(`"${value}" is an invalid status`);
    }

    return value;
  }
}
