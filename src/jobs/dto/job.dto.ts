import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class RejectJobDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartJobDto {
  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsOptional()
  @IsArray()
  beforePhotos?: string[];
}

export class ChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsBoolean()
  completed: boolean;
}

export class MaterialItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  cost: number;
}

export class ProgressJobDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];
}

export class MaterialsJobDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  materials: MaterialItemDto[];
}

export class AdditionalCostDto {
  @IsNumber()
  additionalCost: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

export class CompleteJobDto {
  @IsOptional()
  @IsArray()
  afterPhotos?: string[];

  @IsOptional()
  @IsArray()
  after_photos?: string[];

  @IsOptional()
  @IsString()
  customerSignature?: string;

  @IsOptional()
  @IsString()
  customer_signature?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class ReportIssueDto {
  @IsString()
  @IsNotEmpty()
  issueType: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  photos?: string[];
}
