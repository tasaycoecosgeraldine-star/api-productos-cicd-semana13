
package pe.edu.lab.apiproductos.config;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * StockLab 2.0
 *
 * Filtro de seguridad HTTP.
 *
 * Implementa cabeceras que ayudan a proteger
 * la aplicación web y su API REST.
 *
 * Se utiliza para corregir los hallazgos
 * identificados mediante OWASP ZAP.
 */
@Component
public class SecurityHeadersFilter
        extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        /*
         * 1. PROTECCIÓN CONTRA CLICKJACKING
         *
         * Evita que otras páginas incorporen
         * StockLab dentro de un iframe.
         */
        response.setHeader(
                "X-Frame-Options",
                "DENY"
        );

        /*
         * 2. PROTECCIÓN CONTRA MIME SNIFFING
         *
         * Impide que el navegador interprete
         * archivos como un tipo distinto
         * del declarado por el servidor.
         */
        response.setHeader(
                "X-Content-Type-Options",
                "nosniff"
        );

        /*
         * 3. CONTENT SECURITY POLICY
         *
         * Permite cargar recursos propios
         * del sistema y las fuentes de Google.
         *
         * Se elimina 'unsafe-inline' para
         * scripts y estilos.
         */
        String csp =
                "default-src 'self'; " +

                "script-src 'self'; " +

                "style-src 'self' " +
                "https://fonts.googleapis.com; " +

                "font-src 'self' " +
                "https://fonts.gstatic.com; " +

                "img-src 'self' data:; " +

                "connect-src 'self'; " +

                "object-src 'none'; " +

                "base-uri 'self'; " +

                "form-action 'self'; " +

                "frame-ancestors 'none';";

        response.setHeader(
                "Content-Security-Policy",
                csp
        );

        /*
         * 4. POLÍTICA DE REFERENCIAS
         *
         * Controla qué información de la URL
         * puede enviarse a otros sitios.
         */
        response.setHeader(
                "Referrer-Policy",
                "strict-origin-when-cross-origin"
        );

        /*
         * 5. PROTECCIÓN DE LA API REST
         *
         * Evita que las respuestas de la API
         * se almacenen en caché.
         */
        if (request.getRequestURI().startsWith("/api/")) {

            response.setHeader(
                    "Cache-Control",
                    "no-store"
            );
        }

        /*
         * 6. CONTINUAR CON LA PETICIÓN
         *
         * Permite que Spring Boot procese
         * normalmente las solicitudes.
         */
        filterChain.doFilter(
                request,
                response
        );
    }
}
