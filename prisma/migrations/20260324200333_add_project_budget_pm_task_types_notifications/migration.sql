-- AlterTable
ALTER TABLE `Project` ADD COLUMN `budget` DECIMAL(12, 2) NULL,
    ADD COLUMN `projectManagerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `blocked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `taskType` VARCHAR(191) NOT NULL DEFAULT 'general';

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_orgId_idx`(`orgId`),
    INDEX `Notification_userId_read_idx`(`userId`, `read`),
    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Project_projectManagerId_idx` ON `Project`(`projectManagerId`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_projectManagerId_fkey` FOREIGN KEY (`projectManagerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
