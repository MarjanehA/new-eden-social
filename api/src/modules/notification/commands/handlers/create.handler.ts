import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationRepository } from '../../notification.repository';
import { CreateNotificationCommand } from '../create.command';

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationCommandHandler implements ICommandHandler<CreateNotificationCommand> {
  constructor(
    @InjectRepository(NotificationRepository)
    private readonly repository: NotificationRepository,
    private readonly publisher: EventPublisher,
  ) {
  }

  async execute(command: CreateNotificationCommand) {
    const { notification } = command;
    const entity = this.publisher.mergeObjectContext(
      await this.repository.save(notification),
    );

    // Sends actual event
    await entity.create();

    entity.commit();
  }
}
