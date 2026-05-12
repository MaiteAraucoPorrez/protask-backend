import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard, JwtPayload } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { Request } from 'express';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // ─────────────────────────────────────────────────────────────
    // GET /users  →  List all users (admin only)
    // GET /users?name=&email=&role=&status=&page=&limit=
    // ─────────────────────────────────────────────────────────────
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(@Query() query: UserQueryDto) {
        return this.usersService.findAll(query);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /users/freelancers  →  Public: list freelancers
    // GET /users/freelancers?skill=&location=&page=&limit=
    // ─────────────────────────────────────────────────────────────
    @Get('freelancers')
    findFreelancers(@Query() query: UserQueryDto) {
        return this.usersService.findFreelancers(query);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /users/me  →  Get own profile
    // ─────────────────────────────────────────────────────────────
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() req: Request) {
        const user = (req as any).user as JwtPayload;
        return this.usersService.findOne(user.sub);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /users/:id  →  Get user by ID (auth required)
    // ─────────────────────────────────────────────────────────────
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findOne(id);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /users  →  Create user (admin only; normal users register via /auth/register)
    // ─────────────────────────────────────────────────────────────
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    // ─────────────────────────────────────────────────────────────
    // PUT /users/:id  →  Update user profile
    // ─────────────────────────────────────────────────────────────
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
        @Req() req: Request,
    ) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.update(
            id,
            dto,
            requester.sub,
            requester.role as UserRole,
        );
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /users/:id/password  →  Change password
    // ─────────────────────────────────────────────────────────────
    @Patch(':id/password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    changePassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.changePassword(id, dto, requester.sub);
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /users/:id/verify  →  Verify user (admin only)
    // ─────────────────────────────────────────────────────────────
    @Patch(':id/verify')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    verify(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.verify(id, requester.role as UserRole);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /users/:id  →  Deactivate user (admin only)
    // ─────────────────────────────────────────────────────────────
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.remove(id, requester.role as UserRole);
    }
}
