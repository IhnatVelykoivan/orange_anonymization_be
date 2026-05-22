import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyntheticDatasetsTable1779200000000 implements MigrationInterface {
  name = 'CreateSyntheticDatasetsTable1779200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`synthetic_datasets\` (
        \`id\`            VARCHAR(36)                                  NOT NULL,
        \`userId\`        VARCHAR(36)                                  NOT NULL,
        \`status\`        ENUM('processing','completed','failed')      NOT NULL DEFAULT 'processing',
        \`datasetType\`   VARCHAR(255)                                 NOT NULL,
        \`framework\`     VARCHAR(255)                                 NOT NULL,
        \`outputFormat\`  VARCHAR(255)                                 NOT NULL,
        \`recordsCount\`  INT                                          NOT NULL,
        \`summary\`       JSON                                         NULL,
        \`filePath\`      VARCHAR(512)                                 NULL,
        \`errorMessage\`  TEXT                                         NULL,
        \`createdAt\`     DATETIME(6)                                  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`expiresAt\`     DATETIME                                     NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_synthetic_datasets_userId\` (\`userId\`),
        INDEX \`idx_synthetic_datasets_expiresAt\` (\`expiresAt\`)
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`synthetic_datasets\``);
  }
}
