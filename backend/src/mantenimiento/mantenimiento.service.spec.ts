import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MantenimientoService } from './mantenimiento.service';
import { TareaSolicitada } from './entities/tarea-solicitada.entity';
import { ProgramacionEmpleado } from './entities/programacion-empleado.entity';
import { Operador } from '../autenticacion/entities/operador.entity';

describe('MantenimientoService', () => {
    let service: MantenimientoService;
    let tareasRepository: any;
    let programacionRepository: any;
    let operadorRepository: any;
    let sqlServerDataSource: any;

    // Mock de datos de prueba
    const mockTareas = [
        {
            identificacion: '12345678',
            fechaInicio: '2025-01-15',
            tiempoPlaneacion: '8.5',
            estado: 'completada',
        },
        {
            identificacion: '12345678',
            fechaInicio: '2025-01-16',
            tiempoPlaneacion: '7.0',
            estado: 'completada',
        },
        {
            identificacion: '87654321',
            fechaInicio: '2025-01-15',
            tiempoPlaneacion: '6.5',
            estado: 'completada',
        },
    ];

    const mockProgramaciones = [
        {
            cedula: 12345678,
            fechaProgramacion: new Date('2025-01-15'),
            horarioProgramacion: '07:00 - 15:00',
            area: 'Mantenimiento',
            tiempoADescontar: 0.5,
        },
        {
            cedula: 12345678,
            fechaProgramacion: new Date('2025-01-16'),
            horarioProgramacion: '07:00 - 15:00',
            area: 'Mantenimiento',
            tiempoADescontar: 0,
        },
        {
            cedula: 87654321,
            fechaProgramacion: new Date('2025-01-15'),
            horarioProgramacion: '13:00 - 21:00',
            area: 'Mantenimiento',
            tiempoADescontar: 0,
        },
    ];

    const mockOperadores = [
        {
            cedula: 12345678,
            codigo: '0001',
            nombre: 'Juan Pérez',
            rol: 'Técnico',
            zona: 'Norte',
            padrino: 'Carlos García',
        },
        {
            cedula: 87654321,
            codigo: '0002',
            nombre: 'María López',
            rol: 'Técnico Senior',
            zona: 'Sur',
            padrino: 'Ana Martínez',
        },
    ];

    const mockSqlServerData = [
        {
            f_nit_empl: '12345678',
            f_nombre_empl: 'Juan Pérez Actualizado',
            f_desc_cargo: 'Técnico Electricista',
            f_fecha_nacimiento_emp: new Date('1990-05-15'),
            f_fecha_ingreso: new Date('2020-03-01'),
            f_fecha_retiro: null,
        },
    ];

    beforeEach(async () => {
        // Crear mocks de los repositorios
        const mockQueryBuilder: any = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        };

        tareasRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        programacionRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        operadorRepository = {
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockOperadores),
            }),
        };

        sqlServerDataSource = {
            query: jest.fn().mockResolvedValue(mockSqlServerData),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MantenimientoService,
                {
                    provide: getRepositoryToken(TareaSolicitada, 'mantenimiento'),
                    useValue: tareasRepository,
                },
                {
                    provide: getRepositoryToken(ProgramacionEmpleado, 'programacion'),
                    useValue: programacionRepository,
                },
                {
                    provide: getRepositoryToken(Operador),
                    useValue: operadorRepository,
                },
                {
                    provide: DataSource,
                    useValue: sqlServerDataSource,
                },
            ],
        }).compile();

        service = module.get<MantenimientoService>(MantenimientoService);
    });

    it('debe estar definido', () => {
        expect(service).toBeDefined();
    });

    describe('obtenerDesempenoMantenimiento', () => {
        it('debe retornar reporte de mantenimiento con datos correctos', async () => {
            // Configurar mocks
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue(mockTareas);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue(mockProgramaciones);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            expect(resultado).toBeDefined();
            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado.length).toBeGreaterThan(0);

            // Verificar estructura del primer item
            const primerItem = resultado[0];
            expect(primerItem).toHaveProperty('cedula');
            expect(primerItem).toHaveProperty('nombre');
            expect(primerItem).toHaveProperty('horasRealizadas');
            expect(primerItem).toHaveProperty('horasProgramadas');
            expect(primerItem).toHaveProperty('cumplimiento');
            expect(primerItem).toHaveProperty('rango');
        });

        it('debe calcular correctamente el cumplimiento', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue([
                {
                    identificacion: '12345678',
                    fechaInicio: '2025-01-15',
                    tiempoPlaneacion: '7.5',
                },
            ]);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue([
                {
                    cedula: 12345678,
                    fechaProgramacion: new Date('2025-01-15'),
                    horarioProgramacion: '07:00 - 15:00', // 8 horas
                    area: 'Mantenimiento',
                    tiempoADescontar: 0,
                },
            ]);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');
            expect(operador).toBeDefined();

            // 7.5 horas realizadas / 8 horas programadas = 93.75%
            expect(parseFloat(operador!.cumplimiento)).toBeCloseTo(93.8, 1);
        });

        it('debe asignar rango ORO para cumplimiento >= 95%', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue([
                {
                    identificacion: '12345678',
                    fechaInicio: '2025-01-15',
                    tiempoPlaneacion: '8.0',
                },
            ]);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue([
                {
                    cedula: 12345678,
                    fechaProgramacion: new Date('2025-01-15'),
                    horarioProgramacion: '07:00 - 15:00',
                    area: 'Mantenimiento',
                    tiempoADescontar: 0,
                },
            ]);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');
            expect(operador?.rango).toBe('ORO');
        });

        it('debe asignar rango PLATA para cumplimiento >= 85%', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue([
                {
                    identificacion: '12345678',
                    fechaInicio: '2025-01-15',
                    tiempoPlaneacion: '7.0',
                },
            ]);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue([
                {
                    cedula: 12345678,
                    fechaProgramacion: new Date('2025-01-15'),
                    horarioProgramacion: '07:00 - 15:00',
                    area: 'Mantenimiento',
                    tiempoADescontar: 0,
                },
            ]);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');
            expect(operador?.rango).toBe('PLATA');
        });

        it('debe asignar rango BRONCE para cumplimiento < 85%', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue([
                {
                    identificacion: '12345678',
                    fechaInicio: '2025-01-15',
                    tiempoPlaneacion: '6.0',
                },
            ]);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue([
                {
                    cedula: 12345678,
                    fechaProgramacion: new Date('2025-01-15'),
                    horarioProgramacion: '07:00 - 15:00',
                    area: 'Mantenimiento',
                    tiempoADescontar: 0,
                },
            ]);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');
            expect(operador?.rango).toBe('BRONCE');
        });

        it('debe filtrar solo registros del área de Mantenimiento', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue(mockTareas);

            const progQueryBuilder = programacionRepository.createQueryBuilder();

            await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            // Verificar que se aplicó el filtro de área
            expect(progQueryBuilder.andWhere).toHaveBeenCalledWith(
                'prog.area = :area',
                { area: 'Mantenimiento' }
            );
        });

        it('debe ordenar resultados por cumplimiento descendente', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue(mockTareas);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue(mockProgramaciones);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            // Verificar que está ordenado de mayor a menor
            for (let i = 0; i < resultado.length - 1; i++) {
                const cumplimientoActual = parseFloat(resultado[i].cumplimiento);
                const cumplimientoSiguiente = parseFloat(resultado[i + 1].cumplimiento);
                expect(cumplimientoActual).toBeGreaterThanOrEqual(cumplimientoSiguiente);
            }
        });

        it('debe manejar caso sin horas programadas (cumplimiento 0%)', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue([
                {
                    identificacion: '12345678',
                    fechaInicio: '2025-01-15',
                    tiempoPlaneacion: '8.0',
                },
            ]);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue([]); // Sin programación

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');
            expect(operador?.cumplimiento).toBe('0.0%');
        });

        it('debe enriquecer datos con información de SQL Server', async () => {
            const tareasQueryBuilder = tareasRepository.createQueryBuilder();
            tareasQueryBuilder.getMany.mockResolvedValue(mockTareas);

            const progQueryBuilder = programacionRepository.createQueryBuilder();
            progQueryBuilder.getMany.mockResolvedValue(mockProgramaciones);

            const resultado = await service.obtenerDesempenoMantenimiento(
                '2025-01-01',
                '2025-01-31'
            );

            const operador = resultado.find(r => r.cedula === '12345678');

            // Verificar que se enriqueció con datos de SQL Server
            expect(operador?.nombre).toBe('Juan Pérez Actualizado');
            expect(operador?.rol).toBe('Técnico Electricista');
            expect(operador?.edad).toBeDefined();
            expect(operador?.antiguedad).toBeDefined();
        });
    });
});
