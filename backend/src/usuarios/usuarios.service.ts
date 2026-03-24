import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
    constructor(
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
    ) { }

    async findAll() {
        return await this.usuarioRepository.find({
            select: ['id', 'nombre', 'codigo', 'permisos', 'activo', 'fecha_creacion', 'ultimo_acceso'],
            order: { fecha_creacion: 'DESC' }
        });
    }

    async findOne(id: number) {
        const usuario = await this.usuarioRepository.findOne({
            where: { id },
            select: ['id', 'nombre', 'codigo', 'permisos', 'activo']
        });
        if (!usuario) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        return usuario;
    }

    async create(createUsuarioDto: CreateUsuarioDto) {
        const { codigo, clave } = createUsuarioDto;

        // Verificar si ya existe
        const existe = await this.usuarioRepository.findOne({ where: { codigo } });
        if (existe) throw new ConflictException(`El código ${codigo} ya está en uso`);

        // Hashear clave
        const salt = await bcrypt.genSalt();
        const hashedClave = await bcrypt.hash(clave, salt);

        const nuevoUsuario = this.usuarioRepository.create({
            ...createUsuarioDto,
            clave: hashedClave
        });

        const guardado = await this.usuarioRepository.save(nuevoUsuario);
        const { clave: _, ...resultado } = guardado;
        return resultado;
    }

    async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
        const usuario = await this.findOne(id);

        if (updateUsuarioDto.clave) {
            const salt = await bcrypt.genSalt();
            updateUsuarioDto.clave = await bcrypt.hash(updateUsuarioDto.clave, salt);
        }

        const actualizado = await this.usuarioRepository.save({
            ...usuario,
            ...updateUsuarioDto
        });

        const { clave: _, ...resultado } = actualizado;
        return resultado;
    }

    async remove(id: number) {
        const usuario = await this.findOne(id);
        await this.usuarioRepository.remove(usuario);
        return { message: 'Usuario eliminado correctamente' };
    }
}
