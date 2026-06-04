import { IsString, IsOptional } from 'class-validator';

export class SubmitMilestoneDto {
  @IsString()
  @IsOptional()
  submissionComment?: string;
}
