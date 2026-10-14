import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { PinoLogger } from 'nestjs-pino';

export class TestOnlyBody {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class TestOnlyCredentials {
  password!: string;
}

// Routes used only by e2e tests to exercise the global error format.
@Controller('test-only')
export class TestOnlyController {
  constructor(private readonly logger: PinoLogger) {}

  @Post('validation')
  validate(@Body() body: TestOnlyBody): TestOnlyBody {
    return body;
  }

  @Post('log')
  log(@Body() body: Record<string, unknown>): void {
    this.logger.info({ body }, 'test-only body');
  }

  // Logs a class instance and binds it to the request logger, like a
  // controller logging a transformed DTO.
  @Post('log-instance')
  logInstance(@Body() body: { password: string }): void {
    const credentials = Object.assign(new TestOnlyCredentials(), body);
    this.logger.assign({ bound: credentials });
    this.logger.info({ body: credentials }, 'test-only instance');
  }

  @Get('throw')
  throwUnhandled(): never {
    throw new Error('secret internal failure');
  }
}
