import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_ACCESS_SECRET") ||
        "ef729679db7d429b9a84da1f68cafc683aa8c70dd1583de95201406145743cd7",
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, phone: payload.phone, role: payload.role };
  }
}
