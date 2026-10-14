import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';

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
  @Post('validation')
  validate(@Body() body: TestOnlyBody): TestOnlyBody {
    return body;
  }

  @Get('throw')
  throwUnhandled(): never {
    throw new Error('secret internal failure');
  }
}
