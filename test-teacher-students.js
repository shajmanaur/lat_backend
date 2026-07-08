const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { StudentsService } = require('./dist/modules/students/students.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const studentsService = app.get(StudentsService);
  
  // Test with user_id that has roleId=4 (Teacher)
  const stats = await studentsService.findAll(1, 10, 16, 4); // teacher user_id=16, roleId=4
  console.log("Teacher Students (Limit 2):", JSON.stringify(stats.data.slice(0, 2), null, 2));
  console.log("Total Count:", stats.total);
  
  await app.close();
}
bootstrap();
