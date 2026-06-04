import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';

import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { RevisionMilestoneDto } from './dto/revision-milestone.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';


@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  create(@Body() dto: CreateMilestoneDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.create(dto, user.sub);
  }

  @Get('proposal/:proposalId')
  findByProposal(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.findByProposal(proposalId, user.sub);
  }

  @Get('proposal/:proposalId/summary')
  getSummary(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.getSummary(proposalId, user.sub);
  }


  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.findOne(id, user.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.remove(id, user.sub);
  }

  @Patch(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  start(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.start(id, user.sub);
  }

  @Patch(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitMilestoneDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.submit(id, dto, user.sub);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.approve(id, user.sub);
  }

  @Patch(':id/request-revision')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  requestRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisionMilestoneDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.requestRevision(id, dto, user.sub);
  }
}
