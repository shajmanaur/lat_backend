const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DashboardService } = require('./dist/modules/dashboard/dashboard.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dashboardService = app.get(DashboardService);
  
  // Test with user_id that has roleId=4
  const stats = await dashboardService.getOverviewStats(16, 4); // I saw teacher_id=16 in earlier test
  console.log("Teacher Stats:", JSON.stringify(stats, null, 2));
  
  await app.close();
}
bootstrap();
