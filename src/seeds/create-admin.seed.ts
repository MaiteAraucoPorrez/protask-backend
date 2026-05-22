import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'protask',
  password: process.env.DATABASE_PASSWORD ?? 'protask123',
  database: process.env.DATABASE_NAME ?? 'protask_db',
  entities: [User],
  synchronize: false,
});

async function main() {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(User);

  const email = 'admin@protask.com';
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.status = UserStatus.ACTIVE;
    await repo.save(existing);
    console.log(`✔ Usuario existente actualizado a admin: ${email}`);
  } else {
    const hash = await bcrypt.hash('Admin1234', 10);
    const admin = repo.create({
      name: 'Administrador ProTask',
      email,
      password: hash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    });
    await repo.save(admin);
    console.log('✔ Admin creado exitosamente');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: Admin1234`);
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Error al crear admin:', err);
  process.exit(1);
});
