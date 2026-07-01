import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { AuthUserRow } from '../users/interfaces/auth-user-row.interface';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findForAuthentication(
      dto.organizationSlug,
      dto.email,
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const tokens = await this.generateTokens(user);

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

    await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findForRefresh(payload.sub);

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const tokenValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenValid) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const tokens = await this.generateTokens(user);

    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

    await this.usersService.updateRefreshTokenHash(
      user.id,
      newRefreshTokenHash,
    );

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshTokenHash(userId);
  }

  async profile(userId: string) {
    return this.usersService.findOne(userId);
  }

  private async generateTokens(user: AuthUserRow): Promise<TokenPair> {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessExpires =
      Number(this.configService.get<string>('JWT_ACCESS_EXPIRES_SECONDS')) ||
      900;

    const refreshExpires =
      Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_SECONDS')) ||
      604800;

    const basePayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...basePayload,
          type: 'access',
        },
        {
          secret: accessSecret,
          expiresIn: accessExpires,
        },
      ),

      this.jwtService.signAsync(
        {
          ...basePayload,
          type: 'refresh',
        },
        {
          secret: refreshSecret,
          expiresIn: refreshExpires,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private sanitizeUser(user: AuthUserRow) {
    return {
      id: user.id,
      organizationId: user.organizationId,
      organizationSlug: user.organizationSlug,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
