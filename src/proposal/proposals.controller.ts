import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Query, Delete } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('project/:projectId')
  create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateProposalDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.proposalsService.create(projectId, createDto, user);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @Query() query: ProposalQueryDto,
  ) {
    return this.proposalsService.findByProject(projectId, query);
  }

  @Get('freelancer/me')
  findByFreelancer(
    @Query() query: ProposalQueryDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.proposalsService.findByFreelancer(user.sub, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id/accept')
  acceptProposal(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.proposalsService.acceptProposal(id, user.sub);
  }
  @Patch(':id')
  updateProposal(
      @Param('id') id: string,
      @Body() updateDto: UpdateProposalDto,
      @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.proposalsService.updateProposal(id, updateDto, user.sub);
  }
  @Delete(':id')
  deleteProposal(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.proposalsService.deleteProposal(id, user.sub);
  }

  @Patch(':id/reject')
  rejectProposal(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.proposalsService.rejectProposal(id, user.sub);
  }

  @Patch(':id/withdraw')
  withdrawProposal(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.proposalsService.withdrawProposal(id, user.sub);
  }

}