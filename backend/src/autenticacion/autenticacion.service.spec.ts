import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AutenticacionService } from './autenticacion.service';
import { ApiEmpleadosService } from './services/api-empleados.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as bcrypt from 'bcrypt';

// Mock de bcrypt
jest.mock('bcrypt');

describe('AutenticacionService', () => {
    let service: AutenticacionService;
    let apiEmpleadosService: ApiEmpleadosService;
    let usuarioRepository: any;
    let sqlServerDataSource: any;

    const mockUsuarioAdmin = {
        id: 1,
        codigo: '1000',
        nombre: 'Admin Test',
        clave: 'hashedPassword123',
        activo: true,
        permisos: ['admin'],
    };

    const mockOperadorApi = {
        CodigoOperador: '0001',
        Cedula: '12345678',
    };

    const mockDatosEmpleadoSqlServer = [
        {
            f_nombre_empl: 'Juan Pérez',
            f_desc_cargo: 'Conductor',
            f_fecha_nacimiento_emp: new Date('1990-01-01'),
            f_fecha_ingreso: new Date('2020-01-01'),
            f_fecha_retiro: null,
        },
    ];

    beforeEach(async () => {
        usuarioRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
        };

        sqlServerDataSource = {
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AutenticacionService,
                {
                    provide: ApiEmpleadosService,
                    useValue: {
                        buscarPorCodigoOperador: jest.fn(),
                        obtenerTodosLosEmpleados: jest.fn(),
                    },
                },
                {
                    provide: getDataSourceToken('sqlserver'),
                    useValue: sqlServerDataSource,
                },
                {
                    provide: getRepositoryToken(Usuario),
                    useValue: usuarioRepository,
                },
            ],
        }).compile();

        service = module.get<AutenticacionService>(AutenticacionService);
        apiEmpleadosService = module.get<ApiEmpleadosService>(ApiEmpleadosService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe estar definido', () => {
        expect(service).toBeDefined();
    });

    describe('validarLogin - Usuario Administrativo', () => {
        it('debe autenticar correctamente un usuario admin', async () => {
            usuarioRepository.findOne.mockResolvedValue(mockUsuarioAdmin);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const loginDto = {
                codigo: '1000',
                clave: 'admin123',
            };

            const resultado = await service.validarLogin(loginDto);

            expect(resultado).toBeDefined();
            expect(resultado.usuario.codigo).toBe('1000');
            expect(resultado.usuario.rol).toBe('admin');
            expect(resultado).toHaveProperty('access_token');
        });

        it('debe lanzar error si la contraseña admin es incorrecta', async () => {
            usuarioRepository.findOne.mockResolvedValue(mockUsuarioAdmin);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const loginDto = {
                codigo: '1000',
                clave: 'wrongpassword',
            };

            await expect(service.validarLogin(loginDto)).rejects.toThrow(
                UnauthorizedException
            );
        });
    });

    describe('validarLogin - Operador', () => {
        beforeEach(() => {
            // No hay usuario admin
            usuarioRepository.findOne.mockResolvedValue(null);
        });

        it('debe autenticar correctamente un operador', async () => {
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                mockOperadorApi
            );
            sqlServerDataSource.query.mockResolvedValue(mockDatosEmpleadoSqlServer);

            const loginDto = {
                codigo: '1',
                clave: '12345678',
            };

            const resultado = await service.validarLogin(loginDto);

            expect(resultado).toBeDefined();
            expect(resultado.usuario.codigo).toBe('0001');
            expect(resultado.usuario.nombre).toBe('Juan Pérez');
            expect(resultado.usuario.rol).toBe('operador');
        });

        it('debe formatear el código de operador con ceros a la izquierda', async () => {
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                mockOperadorApi
            );
            sqlServerDataSource.query.mockResolvedValue(mockDatosEmpleadoSqlServer);

            const loginDto = {
                codigo: '1',
                clave: '12345678',
            };

            await service.validarLogin(loginDto);

            expect(apiEmpleadosService.buscarPorCodigoOperador).toHaveBeenCalledWith(
                '0001'
            );
        });

        it('debe lanzar error si el operador no existe en la API', async () => {
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                null
            );

            const loginDto = {
                codigo: '9999',
                clave: '12345678',
            };

            await expect(service.validarLogin(loginDto)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('debe lanzar error si la cédula no coincide', async () => {
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                mockOperadorApi
            );

            const loginDto = {
                codigo: '1',
                clave: '99999999', // Cédula incorrecta
            };

            await expect(service.validarLogin(loginDto)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('debe manejar error en consulta SQL Server y usar datos de fallback', async () => {
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                mockOperadorApi
            );
            sqlServerDataSource.query.mockRejectedValue(
                new Error('SQL Server connection failed')
            );

            const loginDto = {
                codigo: '1',
                clave: '12345678',
            };

            const resultado = await service.validarLogin(loginDto);

            expect(resultado).toBeDefined();
            expect(resultado.usuario.nombre).toBe('Operador'); // Fallback
            expect(resultado.usuario.cargo).toBe('Cargo no especificado'); // Fallback
        });
    });

    describe('obtenerOperadores', () => {
        it('debe retornar lista de operadores', async () => {
            const mockOperadores = [
                { CodigoOperador: '0001', Cedula: '12345678' },
                { CodigoOperador: '0002', Cedula: '87654321' },
            ];

            (apiEmpleadosService.obtenerTodosLosEmpleados as jest.Mock).mockResolvedValue(
                mockOperadores
            );

            const resultado = await service.obtenerOperadores();

            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado.length).toBe(2);
        });

        it('debe manejar error de API y retornar array vacío', async () => {
            (apiEmpleadosService.obtenerTodosLosEmpleados as jest.Mock).mockRejectedValue(
                new Error('API Error')
            );

            const resultado = await service.obtenerOperadores();

            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado.length).toBe(0);
        });
    });

    describe('Consulta a SQL Server', () => {
        it('debe consultar correctamente los datos del empleado', async () => {
            usuarioRepository.findOne.mockResolvedValue(null);
            (apiEmpleadosService.buscarPorCodigoOperador as jest.Mock).mockResolvedValue(
                mockOperadorApi
            );
            sqlServerDataSource.query.mockResolvedValue(mockDatosEmpleadoSqlServer);

            const loginDto = {
                codigo: '1',
                clave: '12345678',
            };

            await service.validarLogin(loginDto);

            // Verificar que se llamó query con la cédula correcta
            expect(sqlServerDataSource.query).toHaveBeenCalled();
            const queryCall = sqlServerDataSource.query.mock.calls[0];
            expect(queryCall[1]).toContain('12345678');
        });
    });
});
