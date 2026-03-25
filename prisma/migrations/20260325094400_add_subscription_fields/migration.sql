-- AlterTable
ALTER TABLE `Organization` ADD COLUMN `customerId` VARCHAR(191) NULL,
    ADD COLUMN `subscriptionEndsAt` DATETIME(3) NULL,
    ADD COLUMN `subscriptionId` VARCHAR(191) NULL,
    ADD COLUMN `subscriptionStatus` VARCHAR(191) NULL,
    ADD COLUMN `subscriptionTier` VARCHAR(191) NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL;
