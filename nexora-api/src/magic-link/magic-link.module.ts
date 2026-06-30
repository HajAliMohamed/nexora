import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { ClientUser } from '../clients/entities/client-user.entity';
import { MagicLinkService } from './magic-link.service';
import { MagicLinkController } from './magic-link.controller';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MagicLinkToken, ClientUser]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    forwardRef(() => ClientsModule),
    UsersModule,
  ],
  providers: [MagicLinkService],
  controllers: [MagicLinkController],
  exports: [MagicLinkService],
})
export class MagicLinkModule {}
