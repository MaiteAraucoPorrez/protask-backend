import { KycVerification, KycStatus } from '../entities/kyc-verification.entity';

export class KycResponseDto {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: KycStatus;
  dniFrentePath?: string | null;
  dniDorsoPath?: string | null;
  selfieConDniPath?: string | null;
  motivoRechazo?: string | null;
  revisadoPorId?: string | null;
  revisadoEn?: Date | null;
  enviadoEn?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(kyc: KycVerification) {
    this.id = kyc.id;
    this.userId = kyc.userId;
    this.status = kyc.status;
    this.dniFrentePath = kyc.dniFrentePath;
    this.dniDorsoPath = kyc.dniDorsoPath;
    this.selfieConDniPath = kyc.selfieConDniPath;
    this.motivoRechazo = kyc.motivoRechazo;
    this.revisadoPorId = kyc.revisadoPorId;
    this.revisadoEn = kyc.revisadoEn;
    this.enviadoEn = kyc.enviadoEn;
    this.createdAt = kyc.createdAt;
    this.updatedAt = kyc.updatedAt;
    if (kyc.user) {
      this.userName = kyc.user.name;
      this.userEmail = kyc.user.email;
    }
  }
}
