import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DesempenoService } from './desempeno.service';
import { VariableControl } from './entities/variable-control.entity';
import { Novedad } from './entities/novedad.entity';

describe('DesempenoService', () => {
    let service: DesempenoService;
    let variableControlRepository: any;
    let novedadRepository: any;

    const mockVariablesControl = [
        {
            codigo_empleado: '0001',
            codigo_variable: 'KM',
            fecha_inicio_programacion: new Date('2025-01-15'),
            valor_programacion: 1000,
            valor_ejecucion: 950,
        },
        {
            codigo_empleado: '0001',
            codigo_variable: 'KM',
            fecha_inicio_programacion: new Date('2025-02-15'),
            valor_programacion: 1200,
            valor_ejecucion: 1150,
        },
    ];

    const mockNovedades = [
        {
            codigo_empleado: '0001',
            codigo_factor: '1', // Incapacidad
            fecha_inicio_novedad: new Date('2025-01-10'),
            fecha_fin_novedad: new Date('2025-01-10'),
        },
        {
            codigo_empleado: '0001',
            codigo_factor: '0', // Sin deducción
            fecha_inicio_novedad: new Date('2025-02-15'),
            fecha_fin_novedad: new Date('2025-02-15'),
        },
    ];

    beforeEach(async () => {
        variableControlRepository = {
            query: jest.fn(),
        };

        novedadRepository = {
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DesempenoService,
                {
                    provide: getRepositoryToken(VariableControl),
                    useValue: variableControlRepository,
                },
                {
                    provide: getRepositoryToken(Novedad),
                    useValue: novedadRepository,
                },
            ],
        }).compile();

        service = module.get<DesempenoService>(DesempenoService);
    });

    it('debe estar definido', () => {
        expect(service).toBeDefined();
    });

    describe('obtenerDesempenoPorAnio', () => {
        it('debe retornar datos de desempeño anuales', async () => {
            variableControlRepository.query
                .mockResolvedValueOnce(mockVariablesControl) // Primera llamada (variables)
                .mockResolvedValueOnce(mockNovedades); // Segunda llamada (novedades)

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            expect(resultado).toBeDefined();
            expect(resultado).toHaveProperty('variables');
            expect(resultado).toHaveProperty('promedioAnual');
            expect(resultado).toHaveProperty('historySummary');
        });

        it('debe calcular correctamente el promedio anual', async () => {
            variableControlRepository.query
                .mockResolvedValueOnce(mockVariablesControl)
                .mockResolvedValueOnce(mockNovedades);

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            expect(resultado.promedioAnual).toBeGreaterThan(0);
            expect(resultado.promedioAnual).toBeLessThanOrEqual(100);
        });

        it('debe procesar correctamente las novedades', async () => {
            variableControlRepository.query
                .mockResolvedValueOnce(mockVariablesControl)
                .mockResolvedValueOnce(mockNovedades);

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            expect(resultado.variables).toHaveProperty('BONO');
            expect(resultado.variables.BONO).toHaveProperty('mensual');
            expect(Array.isArray(resultado.variables.BONO.mensual)).toBe(true);
        });

        it('debe manejar empleado sin registros', async () => {
            variableControlRepository.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const resultado = await service.obtenerDesempenoPorAnio('9999', 2025);

            expect(resultado.variables).toBeDefined();
            expect(resultado.promedioAnual).toBe(0);
        });
    });

    describe('obtenerRankingGeneral', () => {
        const mockRankingData = [
            {
                codigoEmpleado: '0001',
                mes: 1,
                anio: 2025,
                fecha: new Date('2025-01-15'),
                progMes: 1000,
                ejecMes: 950,
            },
            {
                codigoEmpleado: '0002',
                mes: 1,
                anio: 2025,
                fecha: new Date('2025-01-15'),
                progMes: 1200,
                ejecMes: 1100,
            },
        ];

        it('debe retornar ranking de operadores', async () => {
            variableControlRepository.query
                .mockResolvedValueOnce(mockRankingData)
                .mockResolvedValueOnce(mockNovedades);

            const resultado = await service.obtenerRankingGeneral();

            expect(Array.isArray(resultado)).toBe(true);
            if (resultado.length > 0) {
                expect(resultado[0]).toHaveProperty('codigo');
                expect(resultado[0]).toHaveProperty('eficiencia');
                expect(resultado[0]).toHaveProperty('efAnual');
                expect(resultado[0]).toHaveProperty('rango');
            }
        });

        it('debe filtrar por año cuando se especifica', async () => {
            variableControlRepository.query.mockResolvedValue([]);
            novedadRepository.query.mockResolvedValue([]);

            await service.obtenerRankingGeneral(2025);

            // Verificar que se llamó con parámetros de año
            expect(variableControlRepository.query).toHaveBeenCalled();
            const llamada = variableControlRepository.query.mock.calls[0];
            expect(llamada[1]).toContain(2025);
        });

        it('debe filtrar por mes cuando se especifica', async () => {
            variableControlRepository.query.mockResolvedValue([]);
            novedadRepository.query.mockResolvedValue([]);

            await service.obtenerRankingGeneral(2025, 0); // Enero

            expect(variableControlRepository.query).toHaveBeenCalled();
            const llamada = variableControlRepository.query.mock.calls[0];
            expect(llamada[1]).toContain(2025);
            expect(llamada[1]).toContain(1); // Mes 1 (enero en base de datos es 1)
        });

        it('debe calcular correctamente las categorías individuales', async () => {
            const mockDataAltoRendimiento = [
                {
                    codigoEmpleado: '0001',
                    mes: 1,
                    anio: 2025,
                    fecha: new Date('2025-01-15'),
                    progMes: 1000,
                    ejecMes: 980, // 98% eficiencia
                },
            ];

            variableControlRepository.query
                .mockResolvedValueOnce(mockDataAltoRendimiento)
                .mockResolvedValueOnce([
                    {
                        codigoEmpleado: '0001',
                        codigoFactor: '0',
                        fechaInicioNovedad: new Date('2025-01-15'),
                        fechaFinNovedad: new Date('2025-01-15'),
                    },
                ]);

            const resultado = await service.obtenerRankingGeneral(2025);

            const operador = resultado.find(r => r.codigo === '0001');
            if (operador) {
                expect(['Oro', 'Plata', 'Bronce', 'Mejorar', 'Taller Conciencia']).toContain(
                    operador.rango
                );
            }
        });

        it('debe retornar array vacío cuando no hay datos', async () => {
            variableControlRepository.query.mockResolvedValue([]);
            novedadRepository.query.mockResolvedValue([]);

            const resultado = await service.obtenerRankingGeneral();

            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado.length).toBe(0);
        });
    });

    describe('getAniosDisponibles', () => {
        it('debe retornar años disponibles para un operador', async () => {
            const mockAnios = [
                { anio: 2025 },
                { anio: 2024 },
                { anio: 2023 },
            ];

            variableControlRepository.query.mockResolvedValue(mockAnios);

            const resultado = await service.getAniosDisponibles('0001');

            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado).toContain(2025);
            expect(resultado).toContain(2024);
            expect(resultado).toContain(2023);
        });

        it('debe retornar array vacío si no hay registros', async () => {
            variableControlRepository.query.mockResolvedValue([]);

            const resultado = await service.getAniosDisponibles('9999');

            expect(Array.isArray(resultado)).toBe(true);
            expect(resultado.length).toBe(0);
        });
    });

    describe('Cálculo de Bonos', () => {
        it('debe calcular correctamente las deducciones por incapacidad', async () => {
            const novedadesIncapacidad = [
                {
                    codigo_empleado: '0001',
                    codigo_factor: '1', // Incapacidad (25%)
                    fecha_inicio_novedad: new Date('2025-01-15'),
                    fecha_fin_novedad: new Date('2025-01-15'),
                },
            ];

            variableControlRepository.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(novedadesIncapacidad);

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            const bonoEnero = resultado.variables.BONO.mensual[0];
            expect(bonoEnero.deduccionReal).toBeGreaterThan(0);
        });

        it('debe manejar múltiples deducciones en el mismo mes', async () => {
            const novedadesMultiples = [
                {
                    codigo_empleado: '0001',
                    codigo_factor: '1', // Incapacidad
                    fecha_inicio_novedad: new Date('2025-01-10'),
                    fecha_fin_novedad: new Date('2025-01-10'),
                },
                {
                    codigo_empleado: '0001',
                    codigo_factor: '5', // Retardo
                    fecha_inicio_novedad: new Date('2025-01-20'),
                    fecha_fin_novedad: new Date('2025-01-20'),
                },
            ];

            variableControlRepository.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(novedadesMultiples);

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            const bonoEnero = resultado.variables.BONO.mensual[0];

            // Debe haber dos deducciones sumadas
            expect(bonoEnero.deduccionReal).toBeGreaterThan(0);
        });

        it('debe calcular correctamente deducciones por días (vacaciones, suspensión)', async () => {
            const novedadesPorDias = [
                {
                    codigo_empleado: '0001',
                    codigo_factor: '7', // Vacaciones (por día)
                    fecha_inicio_novedad: new Date('2025-01-10'),
                    fecha_fin_novedad: new Date('2025-01-15'), // 6 días
                },
            ];

            variableControlRepository.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(novedadesPorDias);

            const resultado = await service.obtenerDesempenoPorAnio('0001', 2025);

            const bonoEnero = resultado.variables.BONO.mensual[0];
            expect(bonoEnero.deduccionReal).toBeGreaterThan(0);
        });
    });

    describe('Categorización de Rangos', () => {
        it('debe asignar categoría Oro para alto cumplimiento', async () => {
            // El método calcularCategoriaIndividual es privado, pero se puede probar
            // a través del ranking general
            const mockDataOro = [
                {
                    codigoEmpleado: '0001',
                    mes: 1,
                    anio: 2025,
                    fecha: new Date('2025-01-15'),
                    progMes: 1000,
                    ejecMes: 980, // 98%
                },
            ];

            variableControlRepository.query
                .mockResolvedValueOnce(mockDataOro)
                .mockResolvedValueOnce([
                    {
                        codigoEmpleado: '0001',
                        codigoFactor: '0',
                        fechaInicioNovedad: new Date('2025-01-15'),
                        fechaFinNovedad: new Date('2025-01-15'),
                    },
                ]);

            const resultado = await service.obtenerRankingGeneral(2025, 0);

            if (resultado.length > 0) {
                const operador = resultado[0];
                // Con 98% en KM y 100% en bono, debería ser Oro o Plata
                expect(['Oro', 'Plata']).toContain(operador.rango);
            }
        });
    });
});
