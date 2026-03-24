import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { DesempenoModule } from './desempeno/desempeno.module';
import { CargaDatosModule } from './carga-datos/carga-datos.module';
import { Operador } from './autenticacion/entities/operador.entity';
import { VariableControl } from './desempeno/entities/variable-control.entity';
import { Novedad } from './desempeno/entities/novedad.entity';
import { VariableControlPrueba } from './carga-datos/entities/variable-control-prueba.entity';
import { UsuariosModule } from './usuarios/usuarios.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { TareaSolicitada } from './mantenimiento/entities/tarea-solicitada.entity';
import { ProgramacionEmpleado } from './mantenimiento/entities/programacion-empleado.entity';
import { MantenimientoModule } from './mantenimiento/mantenimiento.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST,
      port: 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Operador, VariableControl, Novedad, VariableControlPrueba, Usuario],
      synchronize: false,
    }),
    TypeOrmModule.forRoot({
      name: 'sqlserver',
      type: 'mssql',
      host: process.env.SQLSERVER_HOST,
      port: 1433,
      username: process.env.SQLSERVER_USER,
      password: process.env.SQLSERVER_PASSWORD,
      database: process.env.SQLSERVER_DATABASE,
      extra: {
        trustServerCertificate: true, // Importante para conexiones locales/dev
      },
      synchronize: false,
    }),
    TypeOrmModule.forRoot({
      name: 'mantenimiento',
      type: 'mariadb',
      host: process.env.DB_HOST,
      port: 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'bdsaocomco_mantenimiento',
      entities: [TareaSolicitada],
      synchronize: false,
    }),
    TypeOrmModule.forRoot({
      name: 'programacion',
      type: 'mysql',
      host: process.env.DB_CM_HOST,
      port: Number(process.env.DB_CM_PORT) || 3306,
      username: process.env.DB_CM_USER,
      password: process.env.DB_CM_PASSWORD,
      database: process.env.DB_CM_NAME,
      entities: [ProgramacionEmpleado],
      synchronize: false,
    }),
    AutenticacionModule,
    DesempenoModule,
    CargaDatosModule,
    UsuariosModule,
    MantenimientoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
