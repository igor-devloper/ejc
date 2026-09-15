#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/48ace520b3ef7350419b8af2d596d0d58a49bc112d89ab93cc5a09a7e4a0cb9b/contract';
import startContract from '../../snapshots/48ace520b3ef7350419b8af2d596d0d58a49bc112d89ab93cc5a09a7e4a0cb9b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/da8165b4fcb2e8ad722df7c90fa8739ae0f20256eb46c09e7df6b4b4dac9d911/contract';
import endContract from '../../snapshots/da8165b4fcb2e8ad722df7c90fa8739ae0f20256eb46c09e7df6b4b4dac9d911/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'shopSettings',
        columns: [
          col('cardRate', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('long', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pixRate', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('short', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
