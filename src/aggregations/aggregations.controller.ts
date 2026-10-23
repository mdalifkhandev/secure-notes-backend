import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AggregationsService } from './aggregations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/aggregations')
export class AggregationsController {
  constructor(private readonly aggregationsService: AggregationsService) {}

  /**
   * Scenario 1: Group Users by Interests
   * Endpoint: GET /api/aggregations/interests
   * Uses single collection.aggregate() call.
   */
  @UseGuards(JwtAuthGuard)
  @Get('interests')
  async groupByInterests() {
    return this.aggregationsService.groupByInterests();
  }

  /**
   * Scenario 2: User Posts ($lookup)
   * Endpoint: GET /api/aggregations/user-posts/:userId
   * Uses single aggregation pipeline with a $lookup stage.
   */
  @Get('user-posts/:userId')
  async getUserPosts(@Param('userId') userId: string) {
    return this.aggregationsService.getUserPosts(userId);
  }
}
