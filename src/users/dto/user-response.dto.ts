import { Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    email!: string;

    @Expose()
    role!: UserRole;

    @Expose()
    status!: UserStatus;

    @Expose()
    phone?: string;

    @Expose()
    bio?: string;

    @Expose()
    avatarUrl?: string;

    @Expose()
    location?: string;

    @Expose()
    hourlyRate?: number;

    @Expose()
    skills?: string[];

    @Expose()
    rating!: number;

    @Expose()
    totalReviews!: number;

    @Expose()
    completedProjects!: number;

    @Expose()
    isVerified!: boolean;

    @Expose()
    lastLoginAt?: Date;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    constructor(partial: Partial<UserResponseDto>) {
        Object.assign(this, partial);
    }
}
