import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createDto: CreateProjectDto, @Req() req: Request) {
    return this.projectsService.create(createDto, (req.user as any));
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProjectDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.projectsService.update(id, updateDto, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.projectsService.remove(id, user.sub);
  }
}