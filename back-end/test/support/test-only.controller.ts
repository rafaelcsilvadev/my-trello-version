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

  @Get('throw')
  throwUnhandled(): never {
    throw new Error('secret internal failure');
  }
}
