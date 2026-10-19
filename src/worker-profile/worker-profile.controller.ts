import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { WorkerProfileService } from "./worker-profile.service";
import {
  UpdateWorkerProfileDto,
  UpdateAvailabilityDto,
  ToggleOnlineDto,
  UploadKycDto,
} from "./dto/worker-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";

const uploadStorage = (subfolder: string) => {
  const uploadPath = join(process.cwd(), "uploads", subfolder);
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return diskStorage({
    destination: uploadPath,
    filename: (req, file, cb) => {
      const randomName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  });
};

@ApiTags("Worker Profile & KYC")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("worker")
export class WorkerProfileController {
  constructor(private readonly workerProfileService: WorkerProfileService) {}

  @ApiOperation({ summary: "Get authenticated worker own profile" })
  @Get("profile")
  async getProfile(@Request() req: any) {
    return this.workerProfileService.getProfile(req.user.userId);
  }

  @ApiOperation({
    summary: "Update worker profile (bio, bank details, experience, etc.)",
  })
  @Post("profile/update")
  async updateProfilePost(
    @Request() req: any,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.workerProfileService.updateProfile(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Update worker profile (PATCH)" })
  @Patch("profile/update")
  async updateProfilePatch(
    @Request() req: any,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.workerProfileService.updateProfile(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Update worker profile (PATCH /worker/profile)" })
  @Patch("profile")
  async updateProfileDirect(
    @Request() req: any,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.workerProfileService.updateProfile(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Upload worker profile avatar" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: uploadStorage("avatars"),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @Post("profile/avatar")
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body("avatarUrl") avatarUrlBody?: string,
  ) {
    const avatarUrl = file
      ? `/uploads/avatars/${file.filename}`
      : avatarUrlBody;
    if (!avatarUrl) {
      throw new BadRequestException("Avatar file or avatarUrl is required");
    }
    return this.workerProfileService.updateAvatar(req.user.userId, avatarUrl);
  }

  @ApiOperation({ summary: "Get worker KYC documents and overall status" })
  @Get("kyc")
  async getKyc(@Request() req: any) {
    return this.workerProfileService.getKyc(req.user.userId);
  }

  @ApiOperation({ summary: "Upload KYC document (Aadhaar, PAN, etc.)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: uploadStorage("kyc"),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  @Post("kyc/upload")
  async uploadKyc(
    @Request() req: any,
    @Body() dto: UploadKycDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const documentUrl = file
      ? `/uploads/kyc/${file.filename}`
      : dto.documentUrl;
    return this.workerProfileService.uploadKyc(
      req.user.userId,
      dto,
      documentUrl,
    );
  }

  @ApiOperation({ summary: "Get worker shift availability & area" })
  @Get("availability")
  async getAvailability(@Request() req: any) {
    return this.workerProfileService.getAvailability(req.user.userId);
  }

  @ApiOperation({
    summary: "Save working area, radius, days, and shift timings",
  })
  @Post("availability")
  async updateAvailability(
    @Request() req: any,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.workerProfileService.updateAvailability(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Toggle online/offline status for receiving jobs" })
  @Post("toggle-online")
  async toggleOnlinePost(@Request() req: any, @Body() dto: ToggleOnlineDto) {
    return this.workerProfileService.toggleOnline(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Toggle online/offline status (PATCH)" })
  @Patch("toggle-online")
  async toggleOnlinePatch(@Request() req: any, @Body() dto: ToggleOnlineDto) {
    return this.workerProfileService.toggleOnline(req.user.userId, dto);
  }
}
