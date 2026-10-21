import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateWorkerProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  primaryCategory?: string;

  @IsOptional()
  @IsArray()
  additionalCategories?: string[];

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsString()
  bio?: string;


  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  workingArea?: string;

  @IsOptional()
  @IsNumber()
  serviceRadiusKm?: number;
}

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsString()
  workingArea?: string;

  @IsOptional()
  @IsNumber()
  serviceRadiusKm?: number;

  @IsOptional()
  @IsArray()
  workingDays?: string[];

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isFullTime?: boolean;
}

export class ToggleOnlineDto {
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}

export class UploadKycDto {
  @IsString()
  documentType: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
