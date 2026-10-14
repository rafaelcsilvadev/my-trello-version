import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.schema';
import { MIGRATIONS_GLOB } from './database.module';

// Used only by the TypeORM CLI (migration:generate|run|revert); the app
// connects through DatabaseModule.
export default new DataSource({
  type: 'postgres',
  url: validateEnv(process.env).DATABASE_URL,
  synchronize: false,
  entities: [`${__dirname}/../**/*.entity.{js,ts}`],
  migrations: [MIGRATIONS_GLOB],
});
