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
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard, JwtPayload } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(@Query() query: UserQueryDto) {
        return this.usersService.findAll(query);
    }

    @Get('freelancers')
    @UseInterceptors(CacheInterceptor)
    findFreelancers(@Query() query: UserQueryDto) {
    return this.usersService.findFreelancers(query);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() req: Request) {
        const user = (req as any).user;
        return this.usersService.findOne(user.sub);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
        @Req() req: Request,
    ) {
        const requester = (req as any).user;
        return this.usersService.update(
            id,
            dto,
            requester.id,
            requester.role as UserRole,
        );
    }

    @Post(':id/portfolio')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/portfolios',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `portfolio-${uniqueSuffix}${ext}`);
                },
            }),
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    uploadPortfolioFile(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: any,
        @Req() req: Request,
    ) {
        if (!file) {
                throw new BadRequestException('No files were given');
        }

        const requester = (req as any).user;
        return this.usersService.addPortfolioFile(id, file.path, requester.id);
    }


    @Put(':id/portfolio')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/portfolios',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `portfolio-${uniqueSuffix}${ext}`);
                },
            }),
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async updatePortfolioFile(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: any,
        @Body('oldFilePath') oldFilePath: string,
        @Req() req: Request,
    ) {
        if (!file) {
            throw new BadRequestException('No se proporcionó el archivo nuevo');
        }
        if (!oldFilePath) {
            throw new BadRequestException('Debe especificar la ruta del archivo viejo a reemplazar (oldFilePath)');
        }

        const requester = (req as any).user;

        return this.usersService.updatePortfolioFile(id, oldFilePath, file.path, requester.id);
    }

    @Patch(':id/password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    changePassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        const requester = (req as any).user;
        return this.usersService.changePassword(id, dto, requester.id);
    }

    @Patch(':id/verify')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    verify(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.verify(id, requester.role as UserRole);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        const requester = (req as any).user as JwtPayload;
        return this.usersService.remove(id, requester.role as UserRole);
    }

    @Delete(':id/portfolio')
    @UseGuards(JwtAuthGuard)
    async deletePortfolioFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('filePath') filePath: string,
    @Req() req: Request,) 
    {
    if (!filePath) {
        throw new BadRequestException('Debe especificar la ruta del archivo a eliminar (filePath)');
    }
    const requester = (req as any).user;
    return this.usersService.deletePortfolioFile(id, filePath, requester.id);
}
}
