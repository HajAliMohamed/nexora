import {
  Controller, Post, Get, Body, Req, Res, UseGuards, HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';

const COOKIE_OPTIONS = (isProduction: boolean) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(dto.email, dto.password, dto.name);
    this.setCookies(res, tokens, process.env.NODE_ENV === 'production');
    return { message: 'Signed up successfully' };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);
    this.setCookies(res, tokens, process.env.NODE_ENV === 'production');
    return { message: 'Logged in successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    if (!token) return { message: 'No refresh token' };
    const tokens = await this.authService.refresh(token);
    this.setCookies(res, tokens, process.env.NODE_ENV === 'production');
    return { message: 'Token refreshed' };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    if (token) await this.authService.logout(token);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
    res.clearCookie('refresh_token', { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
    return { message: 'Logged out' };
  }

  @Post('seed-admin')
  async seedAdmin() {
    return this.authService.seedAdmin();
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() _dto: ForgotPasswordDto) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() _dto: ResetPasswordDto) {
    return { message: 'Password has been reset' };
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    isProduction: boolean,
  ) {
    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS(isProduction),
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS(isProduction),
      maxAge: 7 * 24 * 60 * 1000,
    });
  }
}
