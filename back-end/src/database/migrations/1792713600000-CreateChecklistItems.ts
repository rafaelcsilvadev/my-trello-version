import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChecklistItems1792713600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Same position scheme as cards, scoped by card: the deferred unique
    // constraint lets shifts and swaps collide inside a transaction, and its
    // index serves the per-card list, count and counter queries.
    await queryRunner.query(`
      CREATE TABLE "checklist_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "card_id" uuid NOT NULL
          CONSTRAINT "FK_checklist_items_card_id" REFERENCES "cards" ("id") ON DELETE CASCADE,
        "text" varchar(200) NOT NULL,
        "done" boolean NOT NULL DEFAULT false,
        "position" integer NOT NULL
          CONSTRAINT "CHK_checklist_items_position" CHECK ("position" >= 0),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_checklist_items_card_id_position" UNIQUE ("card_id", "position")
          DEFERRABLE INITIALLY DEFERRED
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "checklist_items"');
  }
}
