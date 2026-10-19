import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import {
  LoginDto,
  SignUpDto,
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
} from "./dto/auth.dto";
import { Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.phone }],
      },
      include: {
        worker: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid phone number or password");
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid phone number or password");
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        address: user.address,
        role: user.role,
      },
      worker: user.worker || null,
      ...tokens,
    };
  }

  async signUp(dto: SignUpDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new ConflictException(
        "User with this phone or email already exists",
      );
    }

    const role = dto.role === "WORKER" ? Role.WORKER : Role.CUSTOMER;
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        passwordHash,
        address: dto.address || "Madurai",
        role,
        wallet: {
          create: {
            balance: role === Role.CUSTOMER ? 100.0 : 0.0,
            transactions:
              role === Role.CUSTOMER
                ? {
                    create: [
                      {
                        title: "Welcome Bonus",
                        subtitle: "Credited on account creation",
                        amount: 100.0,
                        date: new Date().toLocaleDateString("en-GB"),
                        isCredit: true,
                      },
                    ],
                  }
                : undefined,
          },
        },
      },
      include: {
        worker: true,
      },
    });

    let worker = user.worker;
    if (role === Role.WORKER && !worker) {
      worker = await this.prisma.worker.create({
        data: {
          userId: user.id,
          name: user.name,
          phone: user.phone,
          profession: "Home Service Specialist",
          hourlyRate: 40.0,
          about: "ServiGo Verified Professional",
          avatarUrl: user.avatar,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        address: user.address,
        role: user.role,
      },
      worker: worker || null,
      ...tokens,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const cleanPhone = dto.phone.trim();
    // Default or dynamic OTP for testing & production
    const generatedOtp = "123456";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await this.prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        otp: generatedOtp,
        expiresAt,
        isUsed: false,
      },
    });

    return {
      success: true,
      message: "OTP sent successfully",
      phone: cleanPhone,
      otp: generatedOtp, // Included for easy development/testing
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const cleanPhone = dto.phone.trim();
    const cleanOtp = dto.otp.trim();

    // Verification check: accept '123456' or valid database OTP
    const isTestOtp = cleanOtp === "123456";
    let otpRecord = null;

    if (!isTestOtp) {
      otpRecord = await this.prisma.otpVerification.findFirst({
        where: {
          phone: cleanPhone,
          otp: cleanOtp,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otpRecord) {
        throw new BadRequestException("Invalid or expired OTP");
      }
    }

    if (otpRecord) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
    }

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: { phone: cleanPhone },
      include: { worker: true },
    });

    if (!user) {
      const defaultPassword = await argon2.hash(`OtpUser_${Date.now()}`);
      user = await this.prisma.user.create({
        data: {
          name: dto.name || `Worker ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          email: `${cleanPhone}@servigo.com`,
          passwordHash: defaultPassword,
          role: Role.WORKER,
          address: "Madurai, TN",
          wallet: {
            create: {
              balance: 0.0,
            },
          },
        },
        include: { worker: true },
      });
    }

    let worker = user.worker;
    if (!worker) {
      // Check if worker with phone exists
      const existingWorker = await this.prisma.worker.findFirst({
        where: { phone: cleanPhone },
      });

      if (existingWorker) {
        worker = await this.prisma.worker.update({
          where: { id: existingWorker.id },
          data: { userId: user.id },
        });
      } else {
        worker = await this.prisma.worker.create({
          data: {
            userId: user.id,
            name: user.name,
            phone: user.phone,
            profession: "Home Service Specialist",
            hourlyRate: 40.0,
            about: "ServiGo Verified Professional",
            isVerified: true,
            isOnline: true,
          },
        });
      }
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      message: "OTP verified successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        address: user.address,
        role: user.role,
      },
      worker,
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const refreshSecret =
        this.configService.get<string>("JWT_REFRESH_SECRET") ||
        "21144ab7d73371fea333e06654ed939a2dfbec3460ed25e2c7995485c519cf2e";
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { worker: true },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const tokens = await this.generateTokens(user.id, user.phone, user.role);

      return {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        worker: user.worker || null,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        worker: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      address: user.address,
      role: user.role,
      worker: user.worker || null,
    };
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    const accessSecret =
      this.configService.get<string>("JWT_ACCESS_SECRET") ||
      "ef729679db7d429b9a84da1f68cafc683aa8c70dd1583de95201406145743cd7";
    const refreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET") ||
      "21144ab7d73371fea333e06654ed939a2dfbec3460ed25e2c7995485c519cf2e";

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRATION") ||
          "15m") as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>("JWT_REFRESH_EXPIRATION") ||
          "7d") as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
