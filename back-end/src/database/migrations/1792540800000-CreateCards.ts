import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCards1792540800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Same position scheme as lists, scoped by list: the deferred unique
    // constraint lets shifts and cross-list moves collide inside a
    // transaction, and its index serves the per-list and per-board queries.
    await queryRunner.query(`
      CREATE TABLE "cards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "list_id" uuid NOT NULL
          CONSTRAINT "FK_cards_list_id" REFERENCES "lists" ("id") ON DELETE CASCADE,
        "title" varchar(100) NOT NULL,
        "description" varchar(5000),
        "due_date" date,
        "done" boolean NOT NULL DEFAULT false,
        "position" integer,
        "archived_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_cards_list_id_position" UNIQUE ("list_id", "position")
          DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "CHK_cards_position_archived"
          CHECK (
            ("archived_at" IS NULL AND "position" IS NOT NULL AND "position" >= 0)
            OR ("archived_at" IS NOT NULL AND "position" IS NULL)
          )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "cards"');
  }
}
