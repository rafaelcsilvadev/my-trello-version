import type { DataSource, EntityManager } from 'typeorm';
import type { PasswordHasher } from '../auth/password-hasher';
import { Board } from '../boards/board.entity';
import { Card } from '../cards/card.entity';
import { ChecklistItem } from '../checklists/checklist-item.entity';
import { Label } from '../labels/label.entity';
import { List } from '../lists/list.entity';
import { User } from '../users/user.entity';
import {
  DEMO_BOARDS,
  DEMO_USER,
  type DemoBoard,
  type DemoCard,
} from './demo-data';

// Writes the demo account in one transaction, straight through the entities:
// the data is trusted, so the services' locks and checks add nothing here.
export async function seedDemo(
  dataSource: DataSource,
  hasher: PasswordHasher,
  today: Date = new Date(),
): Promise<void> {
  const passwordHash = await hasher.hash(DEMO_USER.password);

  await dataSource.transaction(async (manager) => {
    const user = await manager.save(
      manager.create(User, {
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        passwordHash,
      }),
    );
    for (const board of DEMO_BOARDS) {
      await insertBoard(manager, user.id, board, today);
    }
  });
}

async function insertBoard(
  manager: EntityManager,
  ownerId: string,
  demo: DemoBoard,
  today: Date,
): Promise<void> {
  const board = await manager.save(
    manager.create(Board, {
      ownerId,
      title: demo.title,
      description: demo.description ?? null,
      archivedAt: demo.archived ? today : null,
    }),
  );

  const labelIds = new Map<string, string>();
  for (const { name, color } of demo.labels) {
    const label = await manager.save(
      manager.create(Label, { boardId: board.id, name, color }),
    );
    labelIds.set(name, label.id);
  }

  for (const [position, demoList] of demo.lists.entries()) {
    const list = await manager.save(
      manager.create(List, {
        boardId: board.id,
        title: demoList.title,
        position,
      }),
    );
    let cardPosition = 0;
    for (const demoCard of demoList.cards) {
      const position = demoCard.archived ? null : cardPosition++;
      await insertCard(manager, list.id, demoCard, position, labelIds, today);
    }
  }
}

async function insertCard(
  manager: EntityManager,
  listId: string,
  demo: DemoCard,
  position: number | null,
  labelIds: Map<string, string>,
  today: Date,
): Promise<void> {
  const card = await manager.save(
    manager.create(Card, {
      listId,
      title: demo.title,
      description: demo.description ?? null,
      dueDate:
        demo.dueInDays === undefined ? null : addDays(today, demo.dueInDays),
      done: demo.done ?? false,
      position,
      archivedAt: demo.archived ? today : null,
    }),
  );

  for (const name of demo.labels ?? []) {
    const labelId = labelIds.get(name);
    if (!labelId) {
      throw new Error(`Demo card "${demo.title}" uses unknown label "${name}"`);
    }
    // card_labels has no entity; the cards module writes it with raw SQL too.
    await manager.query(
      'INSERT INTO "card_labels" ("card_id", "label_id") VALUES ($1, $2)',
      [card.id, labelId],
    );
  }

  for (const [position, item] of (demo.checklist ?? []).entries()) {
    await manager.save(
      manager.create(ChecklistItem, {
        cardId: card.id,
        text: item.text,
        done: item.done ?? false,
        position,
      }),
    );
  }
}

// YYYY-MM-DD of the seed day in local time, shifted by the given days.
function addDays(today: Date, days: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
