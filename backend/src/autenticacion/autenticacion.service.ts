import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { ApiEmpleadosService } from './services/api-empleados.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AutenticacionService {
    constructor(
        private readonly apiEmpleadosService: ApiEmpleadosService,
        @InjectDataSource('sqlserver')
        private readonly sqlServerDataSource: DataSource,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
    ) { }

    async validarLogin(loginDto: LoginDto) {
        const { codigo, clave } = loginDto;

        // 1. Intentar buscar en la tabla de usuarios administrativos
        const usuarioAdmin = await this.usuarioRepository.findOne({ where: { codigo, activo: true } });

        if (usuarioAdmin) {
            const esClaveValida = await bcrypt.compare(clave, usuarioAdmin.clave);
            if (!esClaveValida) {
                throw new UnauthorizedException('Credenciales administrativas inválidas');
            }

            // Login Administrativo Exitoso
            return {
                mensaje: 'Autenticación administrativa exitosa',
                usuario: {
                    id: usuarioAdmin.id,
                    codigo: usuarioAdmin.codigo,
                    nombre: usuarioAdmin.nombre,
                    rol: 'admin', // Rol genérico para redirección en frontend
                    permisos: usuarioAdmin.permisos,
                },
                access_token: 'jwt-admin-simulado',
            };
        }

        // 2. Si no es admin, intentar como operador
        const codigoFormateado = String(codigo).padStart(4, '0');

        const operador = await this.apiEmpleadosService.buscarPorCodigoOperador(codigoFormateado);

        if (!operador || operador.Cedula !== clave) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // ---------------------------------------------------------
        // Consulta a SQL Server para enriquecer datos (Nombre, Cargo)
        // ---------------------------------------------------------
        let datosEmpleado = {
            f_nombre_empl: 'Operador', // Fallback
            f_desc_cargo: 'Cargo no especificado',
            f_fecha_nacimiento_emp: null,
            f_fecha_ingreso: null,
            f_fecha_retiro: null,
        };

        try {
            // Buscamos el registro más reciente usando parametro y ndc como criterio de ordenación descendente
            // Usamos coincidencia exacta o numérica para manejar ceros a la izquierda en f_nit_empl
            const query = `
                SELECT TOP 1 f_nombre_empl, f_desc_cargo, f_fecha_nacimiento_emp, f_fecha_ingreso, f_fecha_retiro
                FROM SE_W0550
                WHERE f_nit_empl = @0
                OR (ISNUMERIC(f_nit_empl) = 1 AND CAST(f_nit_empl AS BIGINT) = CAST(@0 AS BIGINT))
                ORDER BY f_parametro DESC, f_ndc DESC
            `;
            const resultados = await this.sqlServerDataSource.query(query, [operador.Cedula]);

            if (resultados && resultados.length > 0) {
                datosEmpleado = resultados[0];
            }
        } catch (error) {
            console.error('Error consultando SQL Server en login:', error);
        }

        // ---------------------------------------------------------
        // Validación de Foto (JPG, JPEG, PNG)
        // ---------------------------------------------------------
        const baseUrlFoto = `https://admon.sao6.com.co/web/uploads/empleados/${operador.Cedula}`;
        const extensiones = ['jpg', 'jpeg', 'png'];
        let fotoUrl: string | null = null;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        for (const ext of extensiones) {
            const urlPrueba = `${baseUrlFoto}.${ext}`;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch(urlPrueba, { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    fotoUrl = urlPrueba;
                    break;
                }
            } catch (error) { }
        }
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

        return {
            mensaje: 'Autenticación exitosa',
            usuario: {
                codigo: operador.CodigoOperador,
                cedula: operador.Cedula,
                nombre: datosEmpleado.f_nombre_empl || 'Operador',
                cargo: datosEmpleado.f_desc_cargo,
                fechaNacimiento: datosEmpleado.f_fecha_nacimiento_emp,
                fechaIngreso: datosEmpleado.f_fecha_ingreso,
                fechaRetiro: datosEmpleado.f_fecha_retiro,
                foto: fotoUrl,
                rol: 'operador'
            },
            access_token: 'token-falso-simulado-operador',
        };
    }

    async obtenerTodos() {
        // Obtener operadores desde la API externa
        const operadores = await this.apiEmpleadosService.obtenerTodosLosEmpleados();

        if (operadores.length === 0) return [];

        // Función para normalizar cédulas (quitar ceros a la izquierda y espacios)
        const normalizar = (c: any) => String(c).trim().replace(/^0+/, '');

        const cedulasOriginales = operadores.map((o) => o.Cedula.trim());
        const enrichedMap = new Map();

        try {
            const batchSize = 1000;
            for (let i = 0; i < cedulasOriginales.length; i += batchSize) {
                const batch = cedulasOriginales.slice(i, i + batchSize);

                // Buscamos coincidencia exacta o coincidencia numérica (para ignorar ceros a la izquierda)
                const query = `
                    WITH LatestCargo AS (
                        SELECT 
                            f_nit_empl, 
                            f_desc_cargo, 
                            f_nombre_empl,
                            f_fecha_nacimiento_emp,
                            f_fecha_ingreso,
                            f_fecha_retiro,
                            ROW_NUMBER() OVER (PARTITION BY f_nit_empl ORDER BY f_parametro DESC, f_ndc DESC) as rn
                        FROM SE_W0550
                        WHERE f_nit_empl IN (${batch.map((_, idx) => '@' + idx).join(",")})
                        OR (ISNUMERIC(f_nit_empl) = 1 AND CAST(f_nit_empl AS BIGINT) IN (${batch.map((_, idx) => '@' + (idx + batch.length)).join(",")}))
                    )
                    SELECT f_nit_empl, f_desc_cargo, f_nombre_empl, f_fecha_nacimiento_emp, f_fecha_ingreso, f_fecha_retiro
                    FROM LatestCargo
                    WHERE rn = 1
                `;

                const enriquecidos = await this.sqlServerDataSource.query(query, [...batch, ...batch]);

                enriquecidos.forEach((e) => {
                    const nitNormalizado = normalizar(e.f_nit_empl);
                    enrichedMap.set(nitNormalizado, e);
                });
            }

            return operadores.map((o) => {
                const cedulaNormalizada = normalizar(o.Cedula);
                const extra = enrichedMap.get(cedulaNormalizada);

                return {
                    codigo: o.CodigoOperador,
                    cedula: o.Cedula,
                    nombre: extra?.f_nombre_empl || 'Operador',
                    cargo: extra?.f_desc_cargo || "OPERADOR",
                    fechaNacimiento: extra?.f_fecha_nacimiento_emp,
                    fechaIngreso: extra?.f_fecha_ingreso,
                    fechaRetiro: extra?.f_fecha_retiro,
                    foto: `https://admon.sao6.com.co/web/uploads/empleados/${o.Cedula}.jpg`,
                };
            });
        } catch (error) {
            console.error("Error al enriquecer lista de operadores:", error);
            return operadores.map((o) => ({
                codigo: o.CodigoOperador,
                cedula: o.Cedula,
                nombre: 'Operador',
                cargo: "OPERADOR",
                foto: `https://admon.sao6.com.co/web/uploads/empleados/${o.Cedula}.jpg`,
            }));
        }
    }
}
