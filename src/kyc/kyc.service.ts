import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycVerification, KycStatus } from './entities/kyc-verification.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { RechazarKycDto } from './dto/rechazar-kyc.dto';
import { KycResponseDto } from './dto/kyc-response.dto';
import { ApiResponse, PaginationMeta } from '../common/dto/api-response.dto';

type KycFiles = {
  dniFrente?: Express.Multer.File[];
  dniDorso?: Express.Multer.File[];
  selfieConDni?: Express.Multer.File[];
};

function toRelativePath(file: Express.Multer.File): string {
  const normalized = file.path.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('uploads/');
  return idx >= 0 ? normalized.substring(idx) : normalized;
}

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycVerification)
    private readonly kycRepository: Repository<KycVerification>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async enviarDocumentos(
    userId: string,
    files: KycFiles,
  ): Promise<ApiResponse<KycResponseDto>> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException(
        'Solo los freelancers pueden enviar documentos KYC',
      );
    }

    const hasDniFrente = !!files.dniFrente?.[0];
    const hasDniDorso = !!files.dniDorso?.[0];
    const hasSelfie = !!files.selfieConDni?.[0];

    if (!hasDniFrente && !hasDniDorso && !hasSelfie) {
      throw new BadRequestException('Debe adjuntar al menos un documento');
    }

    let kyc = await this.kycRepository.findOne({ where: { userId } });

    if (kyc?.status === KycStatus.APROBADO) {
      throw new BadRequestException('Tu verificación KYC ya fue aprobada');
    }

    if (kyc) {
      if (hasDniFrente) kyc.dniFrentePath = toRelativePath(files.dniFrente![0]);
      if (hasDniDorso) kyc.dniDorsoPath = toRelativePath(files.dniDorso![0]);
      if (hasSelfie) kyc.selfieConDniPath = toRelativePath(files.selfieConDni![0]);
      kyc.status = KycStatus.PENDIENTE;
      kyc.motivoRechazo = null;
      kyc.revisadoPorId = null;
      kyc.revisadoEn = null;
      kyc.enviadoEn = new Date();
    } else {
      kyc = this.kycRepository.create({
        userId,
        status: KycStatus.PENDIENTE,
        dniFrentePath: hasDniFrente ? toRelativePath(files.dniFrente![0]) : null,
        dniDorsoPath: hasDniDorso ? toRelativePath(files.dniDorso![0]) : null,
        selfieConDniPath: hasSelfie ? toRelativePath(files.selfieConDni![0]) : null,
        enviadoEn: new Date(),
      });
    }

    const saved = await this.kycRepository.save(kyc);
    return ApiResponse.success(
      new KycResponseDto(saved),
      'Documentos KYC enviados correctamente. Tu solicitud está en revisión.',
    );
  }

  async miEstado(userId: string): Promise<ApiResponse<KycResponseDto | null>> {
    const kyc = await this.kycRepository.findOne({ where: { userId } });
    if (!kyc) {
      return ApiResponse.info(null, 'Aún no has enviado documentos KYC');
    }
    return ApiResponse.info(new KycResponseDto(kyc), 'Estado KYC recuperado');
  }

  async findAll(
    page: number,
    limit: number,
    status?: KycStatus,
  ): Promise<ApiResponse<KycResponseDto[]>> {
    const qb = this.kycRepository
      .createQueryBuilder('kyc')
      .leftJoinAndSelect('kyc.user', 'user');

    if (status) qb.andWhere('kyc.status = :status', { status });

    qb.orderBy('kyc.enviadoEn', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalCount] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalCount / limit);

    const pagination: PaginationMeta = {
      totalCount,
      pageSize: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return ApiResponse.info(
      items.map((k) => new KycResponseDto(k)),
      `Se recuperaron ${items.length} verificaciones KYC`,
      pagination,
    );
  }

  async findOne(id: string): Promise<ApiResponse<KycResponseDto>> {
    const kyc = await this.findByIdOrFail(id);
    return ApiResponse.info(new KycResponseDto(kyc), 'Verificación KYC recuperada');
  }

  async aprobar(id: string, adminId: string): Promise<ApiResponse<KycResponseDto>> {
    const kyc = await this.findByIdOrFail(id);

    if (kyc.status === KycStatus.APROBADO) {
      throw new BadRequestException('Esta verificación ya fue aprobada');
    }

    kyc.status = KycStatus.APROBADO;
    kyc.revisadoPorId = adminId;
    kyc.revisadoEn = new Date();
    kyc.motivoRechazo = null;

    const saved = await this.kycRepository.save(kyc);

    await this.usersRepository.update(kyc.userId, {
      isVerified: true,
      verifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    });

    return ApiResponse.success(
      new KycResponseDto(saved),
      'Verificación KYC aprobada. El freelancer ahora está verificado.',
    );
  }

  async rechazar(
    id: string,
    adminId: string,
    dto: RechazarKycDto,
  ): Promise<ApiResponse<KycResponseDto>> {
    const kyc = await this.findByIdOrFail(id);

    if (kyc.status === KycStatus.RECHAZADO) {
      throw new BadRequestException('Esta verificación ya fue rechazada');
    }

    kyc.status = KycStatus.RECHAZADO;
    kyc.revisadoPorId = adminId;
    kyc.revisadoEn = new Date();
    kyc.motivoRechazo = dto.motivoRechazo;

    const saved = await this.kycRepository.save(kyc);
    return ApiResponse.success(new KycResponseDto(saved), 'Verificación KYC rechazada');
  }

  private async findByIdOrFail(id: string): Promise<KycVerification> {
    const kyc = await this.kycRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!kyc) {
      throw new NotFoundException(`Verificación KYC con ID ${id} no encontrada`);
    }
    return kyc;
  }
}
