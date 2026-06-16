import { Module, forwardRef, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';
import { Session } from './entities/session.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    forwardRef(() => UsersModule),
    BillingModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
