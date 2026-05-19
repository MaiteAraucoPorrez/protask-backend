import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
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
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProjectDto, @Req() req: Request) {
    
    return this.projectsService.update(id, updateDto, (req.user as any).id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    
    return this.projectsService.remove(id, (req.user as any).id);
  }
}