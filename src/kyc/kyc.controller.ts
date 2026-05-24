import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { KycService } from './kyc.service';
import { RechazarKycDto } from './dto/rechazar-kyc.dto';
import { JwtAuthGuard, JwtPayload } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { KycStatus } from './entities/kyc-verification.entity';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const kycDiskStorage = diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as any).user?.sub ?? 'tmp';
    const dest = join(process.cwd(), 'uploads', 'kyc', userId);
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${extname(file.originalname)}`);
  },
});

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  // ─────────────────────────────────────────────────────────────
  // POST /kyc/enviar  →  Freelancer envía documentos KYC
  // Acepta multipart/form-data con campos: dniFrente, dniDorso, selfieConDni
  // ─────────────────────────────────────────────────────────────
  @Post('enviar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FREELANCER)
@HttpCode(HttpStatus.CREATED)
@UseInterceptors(
    FileFieldsInterceptor(
        [
            { name: 'dniFrente', maxCount: 1 },
            { name: 'dniDorso', maxCount: 1 },
            { name: 'selfieConDni', maxCount: 1 },
        ],
        {
            storage: kycDiskStorage,
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_MIME.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException('Solo se aceptan archivos JPG, PNG o PDF'),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: { fileSize: MAX_FILE_SIZE },
        },
    ),
)
enviarDocumentos(
    @UploadedFiles()
    files: {
        dniFrente?: Express.Multer.File[];
        dniDorso?: Express.Multer.File[];
        selfieConDni?: Express.Multer.File[];
    },
    @Req() req: Request,
) {
    console.log('=== KYC CONTROLLER DEBUG ===');
    console.log('req.user completo:', (req as any).user);
    console.log('Archivos recibidos:', {
        dniFrente: files.dniFrente?.length || 0,
        dniDorso: files.dniDorso?.length || 0,
        selfieConDni: files.selfieConDni?.length || 0,
    });
    
    const user = (req as any).user;
    console.log('User ID:', user?.id);
    console.log('User role:', user?.role);
    
    if (!user) {
        console.log('No hay usuario en req.user');
        throw new BadRequestException('Usuario no autenticado');
    }
    
    return this.kycService.enviarDocumentos(user.sub, files ?? {});
}

  // ─────────────────────────────────────────────────────────────
  // GET /kyc/mi-estado  →  Freelancer consulta su estado KYC
  // ─────────────────────────────────────────────────────────────
  @Get('mi-estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FREELANCER)
  miEstado(@Req() req: Request) {
    const user = (req as any).user as JwtPayload;
    return this.kycService.miEstado(user.sub);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /kyc  →  Admin: lista todas las solicitudes KYC
  // GET /kyc?status=pendiente&page=1&limit=10
  // ─────────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: KycStatus,
  ) {
    return this.kycService.findAll(+page, +limit, status);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /kyc/:id  →  Admin: ver detalle de una solicitud KYC
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.kycService.findOne(id);
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /kyc/:id/aprobar  →  Admin: aprobar verificación KYC
  // ─────────────────────────────────────────────────────────────
  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  aprobar(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const admin = (req as any).user as JwtPayload;
    return this.kycService.aprobar(id, admin.sub);
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /kyc/:id/rechazar  →  Admin: rechazar verificación KYC
  // Body: { "motivoRechazo": "texto del motivo" }
  // ─────────────────────────────────────────────────────────────
  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  rechazar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazarKycDto,
    @Req() req: Request,
  ) {
    const admin = (req as any).user as JwtPayload;
    return this.kycService.rechazar(id, admin.sub, dto);
  }
}
