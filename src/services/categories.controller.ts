import { Controller, Get } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiOperation({
    summary: "Get list of service categories and skill tags for workers",
  })
  @Get()
  async getCategories() {
    const services = await this.servicesService.getAllServices();
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      basePrice: s.basePrice,
      icon: s.icon,
      tintColor: s.tintColor,
      bannerImage: s.bannerImage,
      skills: [
        s.name,
        `Senior ${s.name} Specialist`,
        "Installation & Repair",
        "Emergency Service",
      ],
    }));
  }
}
