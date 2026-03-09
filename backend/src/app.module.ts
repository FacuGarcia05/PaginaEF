import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TestModule } from '../test/test.module';
import { CategoriesModule } from './categories/categories.module';
import { ItemsModule } from './items/items.module';


@Module({
  imports: [PrismaModule, TestModule, CategoriesModule, ItemsModule],
})
export class AppModule {}
