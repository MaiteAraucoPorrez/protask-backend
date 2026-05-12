import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ApiResponse,
  PaginationMeta,
} from '../common/dto/api-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) { }

  // ─────────────────────────────────────────────────────────────
  // GET ALL with filters + pagination
  // ─────────────────────────────────────────────────────────────
  async findAll(
    query: UserQueryDto,
  ): Promise<ApiResponse<UserResponseDto[]>> {
    const {
      page = 1,
      limit = 10,
      name,
      email,
      role,
      status,
      location,
      skill,
    } = query;

    const where: FindOptionsWhere<User> = {};

    if (name) where.name = ILike(`%${name}%`);
    if (email) where.email = ILike(`%${email}%`);
    if (role) where.role = role;
    if (status) where.status = status;
    if (location) where.location = ILike(`%${location}%`);

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Apply standard filters
    if (name) queryBuilder.andWhere('user.name ILIKE :name', { name: `%${name}%` });
    if (email) queryBuilder.andWhere('user.email ILIKE :email', { email: `%${email}%` });
    if (role) queryBuilder.andWhere('user.role = :role', { role });
    if (status) queryBuilder.andWhere('user.status = :status', { status });
    if (location) queryBuilder.andWhere('user.location ILIKE :location', { location: `%${location}%` });

    // Skill filter for freelancers (searches in array column)
    if (skill) {
      queryBuilder.andWhere('user.skills LIKE :skill', { skill: `%${skill}%` });
    }

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalCount] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalCount / limit);
    const pagination: PaginationMeta = {
      totalCount,
      pageSize: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const data = items.map((u) => new UserResponseDto(u));

    return ApiResponse.info(
      data,
      `Se recuperaron ${items.length} usuarios correctamente`,
      pagination,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GET ONE by ID
  // ─────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.findByIdOrFail(id);
    return ApiResponse.info(
      new UserResponseDto(user),
      'Usuario recuperado exitosamente',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GET freelancers only (public endpoint)
  // ─────────────────────────────────────────────────────────────
  async findFreelancers(
    query: UserQueryDto,
  ): Promise<ApiResponse<UserResponseDto[]>> {
    query.role = UserRole.FREELANCER;
    return this.findAll(query);
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateUserDto): Promise<ApiResponse<UserResponseDto>> {
    // Check duplicate email
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    // Business rule: hourlyRate only for freelancers
    if (dto.hourlyRate !== undefined && dto.role !== UserRole.FREELANCER) {
      throw new BadRequestException(
        'La tarifa por hora solo aplica para freelancers',
      );
    }

    // Business rule: skills only for freelancers
    if (dto.skills?.length && dto.role !== UserRole.FREELANCER) {
      throw new BadRequestException(
        'Las habilidades solo aplican para freelancers',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = this.usersRepository.create({
      ...dto,
      password: hashed,
      status: UserStatus.PENDING_VERIFICATION,
      rating: 0,
      totalReviews: 0,
      completedProjects: 0,
    });

    const saved = await this.usersRepository.save(user);

    return ApiResponse.success(
      new UserResponseDto(saved),
      'Usuario creado exitosamente',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.findByIdOrFail(id);

    // Only admin or the user themselves can update
    if (requesterRole !== UserRole.ADMIN && requesterId !== id) {
      throw new ForbiddenException('No tienes permisos para editar este usuario');
    }

    // Check email uniqueness if changed
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.usersRepository.findOneBy({
        email: dto.email,
      });
      if (emailExists) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    // Only admin can suspend/activate
    if (dto.status && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar el estado del usuario',
      );
    }

    Object.assign(user, dto);
    const updated = await this.usersRepository.save(user);

    return ApiResponse.success(
      new UserResponseDto(updated),
      'Usuario actualizado exitosamente',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────────────────────────
  async changePassword(
    id: string,
    dto: ChangePasswordDto,
    requesterId: string,
  ): Promise<ApiResponse<null>> {
    if (requesterId !== id) {
      throw new ForbiddenException(
        'Solo puedes cambiar tu propia contraseña',
      );
    }

    // Must fetch with password (select: false on entity)
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.save(user);

    return ApiResponse.success(null, 'Contraseña actualizada exitosamente');
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE (soft delete via status)
  // ─────────────────────────────────────────────────────────────
  async remove(
    id: string,
    requesterRole: UserRole,
  ): Promise<ApiResponse<null>> {
    if (requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede eliminar usuarios',
      );
    }

    const user = await this.findByIdOrFail(id);

    // Soft delete: mark as inactive instead of physical delete
    user.status = UserStatus.INACTIVE;
    await this.usersRepository.save(user);

    return ApiResponse.success(null, 'Usuario desactivado exitosamente');
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFY USER (admin action)
  // ─────────────────────────────────────────────────────────────
  async verify(
    id: string,
    requesterRole: UserRole,
  ): Promise<ApiResponse<UserResponseDto>> {
    if (requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede verificar usuarios',
      );
    }

    const user = await this.findByIdOrFail(id);

    if (user.isVerified) {
      throw new BadRequestException('El usuario ya está verificado');
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.status = UserStatus.ACTIVE;

    const updated = await this.usersRepository.save(user);

    return ApiResponse.success(
      new UserResponseDto(updated),
      'Usuario verificado exitosamente',
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  private async findByIdOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
}
