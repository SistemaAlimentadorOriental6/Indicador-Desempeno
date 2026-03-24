import { defineMiddleware } from "astro:middleware";

// Usuarios con acceso al área de administración
const USUARIOS_ADMIN = ["ADMIN", "MarioValle"];

// Rutas públicas: no requieren autenticación
const RUTAS_PUBLICAS = ["/login", "/", "/favicon.svg"];

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Permitir archivos estáticos y rutas públicas sin verificar sesión
    const esPublica =
        RUTAS_PUBLICAS.some((r) => pathname === r) ||
        pathname.startsWith("/_astro/") ||
        pathname.startsWith("/public/") ||
        /\.(svg|png|jpg|jpeg|webp|ico|css|js|woff2?)$/.test(pathname);

    if (esPublica) {
        return next();
    }

    // Leer sesión desde las cookies
    const token      = context.cookies.get("auth_token")?.value;
    const usuarioRaw = context.cookies.get("auth_usuario")?.value;

    // Sin sesión → redirigir al login
    if (!token || !usuarioRaw) {
        return context.redirect("/login?razon=sesion_requerida", 302);
    }

    // Parsear datos del usuario
    let usuario: any;
    try {
        usuario = JSON.parse(decodeURIComponent(usuarioRaw));
    } catch {
        // Cookie corrupta → limpiar y redirigir
        context.cookies.delete("auth_token",   { path: "/" });
        context.cookies.delete("auth_usuario", { path: "/" });
        return context.redirect("/login?razon=sesion_invalida", 302);
    }

    const rol    = (usuario?.rol    ?? "") as string;
    const codigo = (usuario?.codigo ?? usuario?.nombre ?? "") as string;

    // ── Rutas /admin/*: solo administradores ─────────────────────────────
    if (pathname.startsWith("/admin")) {
        const esAdmin =
            rol === "admin" ||
            USUARIOS_ADMIN.some((u) => u.toLowerCase() === codigo.toLowerCase());

        if (!esAdmin) {
            return context.redirect("/login?razon=sin_permisos", 302);
        }
    }

    // ── Rutas /operadores/*: cualquier usuario autenticado puede entrar ───
    // (La verificación de sesión ya se hizo arriba — si llegamos aquí, hay sesión válida)

    return next();
});
