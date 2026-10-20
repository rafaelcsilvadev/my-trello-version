import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabels1792627200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Names are stored trimmed, so the expression index on lower(name) makes
    // them unique per board ignoring case. The palette is written out rather
    // than read from LABEL_COLORS so this migration never changes; a palette
    // change needs a new migration that replaces CHK_labels_color.
    await queryRunner.query(`
      CREATE TABLE "labels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "board_id" uuid NOT NULL
          CONSTRAINT "FK_labels_board_id" REFERENCES "boards" ("id") ON DELETE CASCADE,
        "name" varchar(50) NOT NULL,
        "color" varchar(10) NOT NULL
          CONSTRAINT "CHK_labels_color" CHECK ("color" IN (
            'green', 'yellow', 'orange', 'red', 'purple',
            'blue', 'sky', 'lime', 'pink', 'black'
          )),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_labels_board_id_name"
        ON "labels" ("board_id", lower("name"))
    `);

    // No board_id here: a link's card and label share a board because the
    // service checks it under the board lock. The PK serves lookups by card;
    // the label_id index serves the label delete cascade.
    await queryRunner.query(`
      CREATE TABLE "card_labels" (
        "card_id" uuid NOT NULL
          CONSTRAINT "FK_card_labels_card_id" REFERENCES "cards" ("id") ON DELETE CASCADE,
        "label_id" uuid NOT NULL
          CONSTRAINT "FK_card_labels_label_id" REFERENCES "labels" ("id") ON DELETE CASCADE,
        CONSTRAINT "PK_card_labels" PRIMARY KEY ("card_id", "label_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_card_labels_label_id" ON "card_labels" ("label_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "card_labels"');
    await queryRunner.query('DROP TABLE "labels"');
  }
}
