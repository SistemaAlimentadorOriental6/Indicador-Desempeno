export class CreateUsuarioDto {
    nombre: string;
    codigo: string;
    clave: string;
    permisos?: any;
    activo?: boolean;
}
