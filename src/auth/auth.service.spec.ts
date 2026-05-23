import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus } from '../users/entities/user.entity';

const PASSWORD_PLAIN = 'Password1';
let hashedPassword: string;

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  updateLastLogin: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('devuelve datos del usuario sin token', async () => {
      mockUsersService.create.mockResolvedValue({
        data: {
          id: 'uuid-1',
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.CLIENT,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: PASSWORD_PLAIN,
        role: UserRole.CLIENT,
      });

      expect(result.data).not.toHaveProperty('token');
      expect(result.data.user).toMatchObject({ id: 'uuid-1', email: 'test@example.com' });
    });
  });

  describe('login', () => {
    const activeUser = () => ({
      id: 'uuid-1',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@test.com', password: PASSWORD_PLAIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      mockUsersService.findByEmail.mockResolvedValue(activeUser());

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la cuenta está SUSPENDED', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...activeUser(),
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({ email: 'test@example.com', password: PASSWORD_PLAIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la cuenta está INACTIVE', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...activeUser(),
        status: UserStatus.INACTIVE,
      });

      await expect(
        service.login({ email: 'test@example.com', password: PASSWORD_PLAIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la cuenta está PENDING_VERIFICATION', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...activeUser(),
        status: UserStatus.PENDING_VERIFICATION,
      });

      await expect(
        service.login({ email: 'test@example.com', password: PASSWORD_PLAIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('llama a updateLastLogin en login exitoso', async () => {
      mockUsersService.findByEmail.mockResolvedValue(activeUser());
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);

      await service.login({ email: 'test@example.com', password: PASSWORD_PLAIN });

      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith('uuid-1');
    });

    it('devuelve token y datos del usuario en login exitoso', async () => {
      mockUsersService.findByEmail.mockResolvedValue(activeUser());
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login({ email: 'test@example.com', password: PASSWORD_PLAIN });

      expect(result.data).toHaveProperty('token', 'signed-token');
      expect(result.data.user).toMatchObject({
        id: 'uuid-1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.CLIENT,
      });
    });
  });
});
