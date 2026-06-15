import { IsNumber, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class UpdateProposalDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    offeredPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    estimatedDays?: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;
}