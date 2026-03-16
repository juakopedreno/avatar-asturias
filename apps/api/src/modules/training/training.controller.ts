import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { UpdateTrainingPolicyDto } from "./dto/update-training-policy.dto";
import { TrainingService } from "./training.service";

@ApiTags("training")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("training")
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get("policy")
  async getPolicy() {
    return this.trainingService.getPolicy();
  }

  @Put("policy")
  @Roles("admin", "editor")
  async updatePolicy(@Body() dto: UpdateTrainingPolicyDto) {
    return this.trainingService.updatePolicy(dto);
  }
}
