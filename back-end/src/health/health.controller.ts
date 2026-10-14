import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { checkDatabase, type DatabaseStatus } from './database-health';

export type HealthResponse = {
  status: 'ok' | 'error';
  checks: { database: DatabaseStatus };
};

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  // The 503 body is the health contract, not Problem Details (BE-AD-004),
  // so the status is set on the response instead of throwing.
  @Get()
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
