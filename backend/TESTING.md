# Testing con Jest - Backend

## 📋 Resumen

Este proyecto utiliza **Jest** como framework de testing para garantizar la calidad y confiabilidad del código del backend NestJS.

## 🚀 Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch (se re-ejecutan al guardar cambios)
npm run test:watch

# Generar reporte de cobertura
npm run test:cov

# Ejecutar tests en modo debug
npm run test:debug

# Ejecutar tests E2E (end-to-end)
npm run test:e2e
```

## 📁 Estructura de Tests

```
backend/src/
├── autenticacion/
│   ├── autenticacion.service.ts
│   └── autenticacion.service.spec.ts  ✅
├── desempeno/
│   ├── desempeno.service.ts
│   └── desempeno.service.spec.ts      ✅
├── mantenimiento/
│   ├── mantenimiento.service.ts
│   └── mantenimiento.service.spec.ts  ✅
└── ...
```

## 🧪 Tests Implementados

### 1. **MantenimientoService** (`mantenimiento.service.spec.ts`)

- ✅ Cálculo de cumplimiento de horas
- ✅ Asignación de rangos (ORO/PLATA/BRONCE)
- ✅ Filtrado por área de Mantenimiento
- ✅ Ordenamiento por cumplimiento
- ✅ Enriquecimiento de datos con SQL Server
- ✅ Manejo de casos sin horas programadas

**Ejemplo de ejecución:**

```bash
npm test -- mantenimiento.service.spec
```

### 2. **DesempenoService** (`desempeno.service.spec.ts`)

- ✅ Cálculo de promedios anuales
- ✅ Procesamiento de novedades
- ✅ Ranking general de operadores
- ✅ Filtros por año y mes
- ✅ Deducciones por incapacidad, retardos, etc.
- ✅ Categorización de rangos

**Ejemplo de ejecución:**

```bash
npm test -- desempeno.service.spec
```

### 3. **AutenticacionService** (`autenticacion.service.spec.ts`)

- ✅ Login de usuarios administrativos
- ✅ Login de operadores
- ✅ Validación de credenciales
- ✅ Formateo de códigos
- ✅ Consultas a SQL Server
- ✅ Manejo de errores y fallback

**Ejemplo de ejecución:**

```bash
npm test -- autenticacion.service.spec
```

## 📊 Reporte de Cobertura

Para generar un reporte HTML de cobertura:

```bash
npm run test:cov
```

El reporte se generará en `backend/coverage/lcov-report/index.html`

## 🎯 Buenas Prácticas de Testing

### 1. **Estructura AAA** (Arrange-Act-Assert)

```typescript
it('debe calcular el cumplimiento correctamente', async () => {
    // ARRANGE: Configurar mocks y datos de prueba
    const mockTareas = [{ horas: 8 }];
    repository.find.mockResolvedValue(mockTareas);
    
    // ACT: Ejecutar la función a testear
    const resultado = await service.calcularCumplimiento();
    
    // ASSERT: Verificar resultados
    expect(resultado).toBe(100);
});
```

### 2. **Nombrar tests descriptivamente**

```typescript
// ❌ MAL
it('test 1', () => { ... });

// ✅ BIEN
it('debe lanzar error si la cédula no coincide', () => { ... });
```

### 3. **Aislar dependencias con mocks**

```typescript
const mockRepository = {
    find: jest.fn(),
    save: jest.fn(),
};
```

### 4. **Limpiar después de cada test**

```typescript
afterEach(() => {
    jest.clearAllMocks();
});
```

## 🔧 Configuración de Jest

La configuración está en `package.json`:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

## 📝 Crear Nuevos Tests

### Template básico

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MiServicio } from './mi-servicio.service';

describe('MiServicio', () => {
    let service: MiServicio;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MiServicio],
        }).compile();

        service = module.get<MiServicio>(MiServicio);
    });

    it('debe estar definido', () => {
        expect(service).toBeDefined();
    });

    describe('miMetodo', () => {
        it('debe retornar el resultado esperado', async () => {
            // Arrange
            const input = 'test';
            
            // Act
            const resultado = await service.miMetodo(input);
            
            // Assert
            expect(resultado).toBe('expected');
        });
    });
});
```

## 🐛 Debugging Tests

Para debuggear un test específico:

```bash
npm run test:debug -- --testNamePattern="nombre del test"
```

Luego abre Chrome en `chrome://inspect`

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://testingjavascript.com/)

## ✅ Checklist de Testing

Antes de hacer un commit con cambios importantes:

- [ ] Ejecutar `npm test` y verificar que todos los tests pasen
- [ ] Verificar cobertura de código (`npm run test:cov`)
- [ ] Actualizar tests si modificas la lógica de negocio
- [ ] Agregar tests para nuevas funcionalidades
- [ ] Revisar que no hay tests pendientes o ignorados (`it.skip`)

## 🎓 Próximos Pasos

1. **Aumentar cobertura**: Agregar tests para controllers y guards
2. **Tests E2E**: Implementar tests de integración completos
3. **CI/CD**: Configurar tests automáticos en el pipeline
4. **Performance testing**: Agregar tests de carga y rendimiento
5. **Mutation testing**: Usar herramientas como Stryker

---

**Última actualización**: 2025-01-30
