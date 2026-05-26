import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf', 'application/zip'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const deliveryDiskStorage = diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as any).user?.sub ?? 'tmp';
    const dest = join(process.cwd(), 'uploads', 'deliveries', userId);
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `delivery-${unique}${extname(file.originalname)}`);
  },
});

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'files', maxCount: 10 }], {
      storage: deliveryDiskStorage,
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Tipo de archivo no permitido'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async create(
    @Body() createDto: CreateDeliveryDto,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const uploadedFiles = files?.files || [];

    return this.deliveriesService.create(createDto, uploadedFiles, user.sub);
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.deliveriesService.findByProposal(proposalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveriesService.findOne(id);
  }
}