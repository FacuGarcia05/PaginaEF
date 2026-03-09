import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.item.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      throw new NotFoundException('item not found');
    }

    return item;
  }

  async findByCategorySlug(categorySlug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      throw new NotFoundException('category not found');
    }

    const items = await this.prisma.item.findMany({
      where: { categoryId: category.id },
      orderBy: { createdAt: 'desc' },
    });

    return { category, items };
  }

  async create(data: CreateItemDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('category not found');
    }

    const slug = await this.buildUniqueSlug(data.categoryId, data.title);

    try {
      return await this.prisma.item.create({
        data: {
          title: data.title.trim(),
          slug,
          imageUrl: data.imageUrl.trim(),
          description: data.description?.trim(),
          categoryId: data.categoryId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('item slug already exists in this category');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('item not found');
    }

    await this.prisma.item.delete({
      where: { id },
    });

    return { success: true };
  }

  async update(id: string, data: UpdateItemDto) {
    const existing = await this.prisma.item.findUnique({
      where: { id },
      select: { id: true, categoryId: true },
    });

    if (!existing) {
      throw new NotFoundException('item not found');
    }

    const title = data.title?.trim();
    const imageUrl = data.imageUrl?.trim();
    const description = data.description?.trim();

    if (
      typeof title === 'undefined' &&
      typeof imageUrl === 'undefined' &&
      typeof description === 'undefined'
    ) {
      throw new BadRequestException('at least one field is required to update');
    }

    let nextSlug: string | undefined;
    if (title) {
      nextSlug = await this.buildUniqueSlug(existing.categoryId, title, id);
    }

    try {
      return await this.prisma.item.update({
        where: { id },
        data: {
          title,
          slug: nextSlug,
          imageUrl,
          description,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('item slug already exists in this category');
      }
      throw error;
    }
  }

  private async buildUniqueSlug(
    categoryId: string,
    title: string,
    excludeItemId?: string,
  ) {
    const baseSlug = this.slugify(title);
    const existing = await this.prisma.item.findMany({
      where: {
        categoryId,
        slug: { startsWith: baseSlug },
        ...(excludeItemId
          ? {
              NOT: {
                id: excludeItemId,
              },
            }
          : {}),
      },
      select: { slug: true },
    });

    const used = new Set(existing.map((item) => item.slug));
    if (!used.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;
    while (used.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private slugify(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return normalized || 'item';
  }
}
