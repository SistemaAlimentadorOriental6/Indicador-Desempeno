import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CargaDatosService } from './carga-datos.service';

@Controller('carga-datos')
export class CargaDatosController {
    constructor(private readonly cargaDatosService: CargaDatosService) { }

    @Post('kilometros')
    @UseInterceptors(FileInterceptor('archivo'))
    async cargarKilometros(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Debe subir un archivo Excel');
        }
        return this.cargaDatosService.procesarExcelKilometros(file);
    }

    @Post('novedades')
    @UseInterceptors(FileInterceptor('archivo'))
    async cargarNovedades(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Debe subir un archivo Excel');
        }
        return this.cargaDatosService.procesarExcelNovedades(file);
    }
}
