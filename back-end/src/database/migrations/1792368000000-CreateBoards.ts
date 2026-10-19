import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBoards1792368000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "boards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL
          CONSTRAINT "FK_boards_owner_id" REFERENCES "users" ("id") ON DELETE CASCADE,
        "title" varchar(100) NOT NULL,
        "description" varchar(1000),
        "archived_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_boards_owner_id_created_at" ON "boards" ("owner_id", "created_at" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "boards"');
  }
}
