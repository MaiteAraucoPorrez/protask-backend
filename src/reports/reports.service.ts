import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EscrowDeposit, EscrowEstado } from '../escrow/entities/escrow-deposit.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { GenerateReportDto, ReportType, ExportFormat } from './dto/generate-report.dto';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(EscrowDeposit)
    private escrowRepository: Repository<EscrowDeposit>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async generateReport(dto: GenerateReportDto, res: Response): Promise<void> {
    const { type, startDate, endDate, onlyVerified, includeCancelled, groupByCategory, format } = dto;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let data: any;
    let filename: string;
    let title: string;

    switch (type) {
      case ReportType.TRANSACTIONS:
        data = await this.getTransactionsData(start, end);
        title = `Reporte de Transacciones - ${startDate} al ${endDate}`;
        filename = `transacciones_${startDate}_${endDate}`;
        break;
      case ReportType.ACTIVE_USERS:
        data = await this.getActiveUsersData(start, end, onlyVerified);
        title = `Reporte de Usuarios Activos - ${startDate} al ${endDate}`;
        filename = `usuarios_activos_${startDate}_${endDate}`;
        break;
      case ReportType.COMPLETED_PROJECTS:
        data = await this.getCompletedProjectsData(start, end, includeCancelled, groupByCategory);
        title = `Reporte de Proyectos Completados - ${startDate} al ${endDate}`;
        filename = `proyectos_completados_${startDate}_${endDate}`;
        break;
      default:
        throw new BadRequestException('Tipo de reporte no válido');
    }

    if (!data || data.length === 0) {
      throw new BadRequestException('No hay datos para el rango de fechas seleccionado');
    }

    switch (format) {
      case ExportFormat.PDF:
        await this.exportToPDF(data, title, filename, res);
        break;
      case ExportFormat.EXCEL:
        await this.exportToExcel(data, title, filename, res);
        break;
      case ExportFormat.CSV:
        await this.exportToCSV(data, title, filename, res);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Data extraction methods
  // ─────────────────────────────────────────────────────────────

  private async getTransactionsData(start: Date, end: Date): Promise<any[]> {
    const deposits = await this.escrowRepository.find({
      where: {
        depositadoEn: Between(start, end),
      },
      relations: ['proposal', 'proposal.project', 'cliente', 'freelancer'],
      order: { depositadoEn: 'DESC' },
    });

    return deposits.map(d => ({
      id: d.id,
      fecha: d.depositadoEn,
      cliente: d.cliente?.name || d.cliente?.email,
      freelancer: d.freelancer?.name || d.freelancer?.email,
      proyecto: d.proposal?.project?.title || 'N/A',
      monto: d.monto,
      estado: d.estado,
      liberadoEn: d.liberadoEn,
      reembolsadoEn: d.reembolsadoEn,
    }));
  }

  private async getActiveUsersData(start: Date, end: Date, onlyVerified?: boolean): Promise<any[]> {
    const where: any = {
      role: UserRole.FREELANCER,
      lastLoginAt: Between(start, end),
    };

    if (onlyVerified) {
      where.isVerified = true;
    }

    const users = await this.userRepository.find({
      where,
      order: { lastLoginAt: 'DESC' },
    });

    return users.map(u => ({
      id: u.id,
      nombre: u.name,
      email: u.email,
      ultimoLogin: u.lastLoginAt,
      verificado: u.isVerified,
      calificacion: u.rating,
      proyectosCompletados: u.completedProjects,
    }));
  }

  private async getCompletedProjectsData(
    start: Date,
    end: Date,
    includeCancelled?: boolean,
    groupByCategory?: boolean,
  ): Promise<any[]> {
    const statuses = ['completed'];
    if (includeCancelled) {
      statuses.push('cancelled');
    }

    const projects = await this.projectRepository.find({
      where: {
        status: 'completed',
        updatedAt: Between(start, end),
      },
      relations: ['client'],
      order: { updatedAt: 'DESC' },
    });

    if (groupByCategory) {
      const grouped = projects.reduce((acc, p) => {
        const category = p.category || 'Sin categoría';
        if (!acc[category]) acc[category] = [];
        acc[category].push(p);
        return acc;
      }, {});

      return Object.entries(grouped).map(([category, items]) => ({
        categoria: category,
        cantidad: (items as any[]).length,
        proyectos: items,
      }));
    }

    return projects.map(p => ({
      id: p.id,
      titulo: p.title,
      categoria: p.category,
      cliente: p.client?.name || p.client?.email,
      presupuesto: p.budget,
      fechaCompletado: p.updatedAt,
      estado: p.status,
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // Export methods
  // ─────────────────────────────────────────────────────────────

  private async exportToPDF(data: any[], title: string, filename: string, res: Response): Promise<void> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(12).text(`Total de registros: ${data.length}`);
    doc.moveDown();

    // Table headers
    const headers = Object.keys(data[0] || {});
    const columnWidth = (doc.page.width - 100) / headers.length;

    doc.fontSize(10).font('Helvetica-Bold');
    let y = doc.y;
    let x = 50;
    headers.forEach(header => {
      doc.text(this.formatHeader(header), x, y, { width: columnWidth, align: 'center' });
      x += columnWidth;
    });

    doc.font('Helvetica');
    y += 20;
    doc.y = y;

    // Table rows
    for (const row of data) {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        y = doc.y;
        x = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach(header => {
          doc.text(this.formatHeader(header), x, y, { width: columnWidth, align: 'center' });
          x += columnWidth;
        });
        doc.font('Helvetica');
        y += 20;
        doc.y = y;
      }

      x = 50;
      headers.forEach(header => {
        const value = this.formatValue(row[header]);
        doc.text(value, x, doc.y, { width: columnWidth, align: 'center' });
        x += columnWidth;
      });
      doc.moveDown(0.5);
    }

    doc.end();
  }

  private async exportToExcel(data: any[], title: string, filename: string, res: Response): Promise<void> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // Add title
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Add generation date
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = `Generado: ${new Date().toLocaleString()}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  // Headers
  const headers = Object.keys(data[0] || {});
  const headerRow = worksheet.addRow(headers.map(h => this.formatHeader(h)));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  });

  // Data rows
  for (const row of data) {
    const values = headers.map(h => this.formatValue(row[h]));
    worksheet.addRow(values);
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellLength = cell.value ? cell.value.toString().length : 10;
      maxLength = Math.max(maxLength, cellLength);
    });
    column.width = Math.min(maxLength + 2, 30);
  });

  // Configurar headers ANTES de escribir
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

  // Escribir la respuesta
  await workbook.xlsx.write(res);
  res.end();
}

  private async exportToCSV(data: any[], title: string, filename: string, res: Response): Promise<void> {
    const headers = Object.keys(data[0] || {});
    const formattedHeaders = headers.map(h => this.formatHeader(h));
    
    const rows = data.map(row => 
      headers.map(h => this.formatValue(row[h]))
    );
    
    const csvContent = stringify([formattedHeaders, ...rows]);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    res.send(csvContent);
  }

  private formatHeader(header: string): string {
    const headers: Record<string, string> = {
      id: 'ID',
      fecha: 'Fecha',
      cliente: 'Cliente',
      freelancer: 'Freelancer',
      proyecto: 'Proyecto',
      monto: 'Monto (Bs.)',
      estado: 'Estado',
      liberadoEn: 'Fecha Liberación',
      reembolsadoEn: 'Fecha Reembolso',
      nombre: 'Nombre',
      email: 'Email',
      ultimoLogin: 'Último Login',
      verificado: 'Verificado',
      calificacion: 'Calificación',
      proyectosCompletados: 'Proyectos Completados',
      titulo: 'Título',
      categoria: 'Categoría',
      presupuesto: 'Presupuesto (Bs.)',
      fechaCompletado: 'Fecha Completado',
      clienteNombre: 'Cliente',
    };
    return headers[header] || header;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) return value.toLocaleDateString('es-BO');
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}