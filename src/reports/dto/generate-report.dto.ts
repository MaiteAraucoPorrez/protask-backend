import { IsEnum, IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';

export enum ReportType {
  TRANSACTIONS = 'transacciones',
  ACTIVE_USERS = 'usuarios_activos',
  COMPLETED_PROJECTS = 'proyectos_completados',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type!: ReportType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  onlyVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  includeCancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  groupByCategory?: boolean;

  @IsEnum(ExportFormat)
  format!: ExportFormat;
}