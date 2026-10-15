import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { checkDatabase, type DatabaseStatus } from './database-health';

export type HealthResponse = {
  status: 'ok' | 'error';
  checks: { database: DatabaseStatus };
};

@ApiTags('health')
// The Docker healthcheck calls it without a token.
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  // The 503 body is the health contract, not Problem Details (BE-AD-004),
  // so the status is set on the response instead of throwing.
  @Get()
  @ApiOkResponse({ description: "Database answered: `{ status: 'ok' }`." })
  @ApiServiceUnavailableResponse({
    description: "Database down or slower than 3 s: `{ status: 'error' }`.",
  })
  async get(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    const database = await checkDatabase(this.dataSource);
    if (database === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', checks: { database } };
    }
    return { status: 'ok', checks: { database } };
  }
}
