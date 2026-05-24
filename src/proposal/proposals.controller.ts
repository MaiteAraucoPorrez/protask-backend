import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { Column } from 'typeorm';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('project/:projectId')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateProposalDto,
    @Req() req: Request,)   
    {
    const user = (req as any).user;  
    return this.proposalsService.create(projectId, createDto, user);
    }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.proposalsService.findByProject(projectId);
  }

  @Get('freelancer/me')
  findByFreelancer(@Req() req: Request) {
    return this.proposalsService.findByFreelancer((req.user as any).id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptProposal(
  @Param('id') id: string,
  @Req() req: Request,) 
  {
  const user = (req as any).user;

  //ID dueño de proyecto a colocar en patch
  return this.proposalsService.acceptProposal(id, user.id);
  }
  @Column({ nullable: true })
   selectedFreelancerId?: string;


}