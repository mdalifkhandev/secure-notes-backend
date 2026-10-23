import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotesModule } from './notes/notes.module';
import { PostsModule } from './posts/posts.module';
import { AggregationsModule } from './aggregations/aggregations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri =
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGODB_URI ||
          'mongodb://localhost:27017/secure_notes';

        if (!configService.get<string>('MONGODB_URI') && !process.env.MONGODB_URI) {
          console.warn(
            '⚠️ [WARNING] MONGODB_URI is not set! In a serverless environment, connection to localhost:27017 will fail.',
          );
        }

        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),
    AuthModule,
    UsersModule,
    NotesModule,
    PostsModule,
    AggregationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
