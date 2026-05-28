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

/**
 * HU-F13: Gestión de Hitos
 *
 * Permite dividir un proyecto (propuesta aceptada) en hitos con
 * pagos y entregas parciales por etapa.
 *
 * Flujo completo:
 *   1. Cliente crea hitos          → POST   /milestones
 *   2. Freelancer inicia hito      → PATCH  /milestones/:id/start
 *   3. Freelancer entrega hito     → PATCH  /milestones/:id/submit
 *   4a. Cliente aprueba            → PATCH  /milestones/:id/approve
 *   4b. Cliente pide revisión      → PATCH  /milestones/:id/request-revision
 *   5. Freelancer corrige y vuelve → PATCH  /milestones/:id/submit
 */
@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  // ── CRUD (cliente) ──────────────────────────────────────────────────────

  /**
   * POST /milestones
   * Crea un nuevo hito para una propuesta aceptada.
   * Solo el cliente del proyecto puede hacerlo.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  create(@Body() dto: CreateMilestoneDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.create(dto, user.sub);
  }

  /**
   * GET /milestones/proposal/:proposalId
   * Lista todos los hitos de una propuesta ordenados por número de orden.
   * Accesible por cliente o freelancer de la propuesta.
   */
  @Get('proposal/:proposalId')
  findByProposal(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.findByProposal(proposalId, user.sub);
  }

  /**
   * GET /milestones/proposal/:proposalId/summary
   * Resumen de progreso: conteo por estado, montos y porcentaje de avance.
   */
  @Get('proposal/:proposalId/summary')
  getSummary(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.milestonesService.getSummary(proposalId, user.sub);
  }

  /**
   * GET /milestones/:id
   * Detalle de un hito específico.
   * Accesible por cliente o freelancer de la propuesta.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.findOne(id, user.sub);
  }

  /**
   * PATCH /milestones/:id
   * Actualiza un hito (solo si está en estado "pendiente").
   * Solo el cliente puede editar.
   */
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

  /**
   * DELETE /milestones/:id
   * Elimina un hito (solo si está en estado "pendiente").
   * Solo el cliente puede eliminar.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.remove(id, user.sub);
  }

  // ── Flujo de trabajo ────────────────────────────────────────────────────

  /**
   * PATCH /milestones/:id/start
   * El freelancer inicia el trabajo en un hito (pendiente → en_progreso).
   * Regla: trabajo secuencial — no se puede saltar hitos.
   */
  @Patch(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  start(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.start(id, user.sub);
  }

  /**
   * PATCH /milestones/:id/submit
   * El freelancer marca el hito como entregado (en_progreso | revision_solicitada → entregado).
   * Puede incluir un comentario de entrega.
   */
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

  /**
   * PATCH /milestones/:id/approve
   * El cliente aprueba el hito (entregado → aprobado).
   * Equivale a liberar el pago correspondiente a este hito.
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.milestonesService.approve(id, user.sub);
  }

  /**
   * PATCH /milestones/:id/request-revision
   * El cliente solicita correcciones (entregado → revision_solicitada).
   * Requiere un comentario explicando qué debe corregirse.
   */
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
