import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLists1792454400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // The unique constraint is deferred so a shift (position = position ± 1)
    // may collide row by row inside a transaction; duplicates left at COMMIT
    // still fail. Its index also serves the active lists query.
    await queryRunner.query(`
      CREATE TABLE "lists" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "board_id" uuid NOT NULL
          CONSTRAINT "FK_lists_board_id" REFERENCES "boards" ("id") ON DELETE CASCADE,
        "title" varchar(100) NOT NULL,
        "position" integer,
        "archived_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_lists_board_id_position" UNIQUE ("board_id", "position")
          DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "CHK_lists_position_archived"
          CHECK (
            ("archived_at" IS NULL AND "position" IS NOT NULL AND "position" >= 0)
            OR ("archived_at" IS NOT NULL AND "position" IS NULL)
          )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "lists"');
  }
}
