import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('items')
  findAll() {
    return this.itemsService.findAll();
  }

  @Get('items/:id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.itemsService.findById(id);
  }

  @Get('categories/:slug/items')
  findByCategorySlug(@Param('slug') slug: string) {
    return this.itemsService.findByCategorySlug(slug);
  }

  @Post('items')
  @UseGuards(AdminGuard)
  create(@Body() data: CreateItemDto) {
    return this.itemsService.create(data);
  }

  @Delete('items/:id')
  @UseGuards(AdminGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.itemsService.remove(id);
  }

  @Patch('items/:id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateItemDto,
  ) {
    return this.itemsService.update(id, data);
  }
}
