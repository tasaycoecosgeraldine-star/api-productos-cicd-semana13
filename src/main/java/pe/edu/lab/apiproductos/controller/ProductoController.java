
package pe.edu.lab.apiproductos.controller;

import pe.edu.lab.apiproductos.model.Producto;
import pe.edu.lab.apiproductos.service.ProductoService;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService service;
    public ProductoController(ProductoService service) {
        this.service = service;
    }


    @GetMapping
    public ResponseEntity<?> listar(
            @RequestHeader(
                value = HttpHeaders.ACCEPT,
                required = false
            ) String accept) {

        boolean solicitaHtml = accept != null
                && accept.contains(MediaType.TEXT_HTML_VALUE);

        if (solicitaHtml) {

            Resource pagina = new ClassPathResource(
                "static/productos.html"
            );

            if (!pagina.exists()) {
                return ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.TEXT_PLAIN)
                        .body("No se encontró productos.html");
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(pagina);
        }

        List<Producto> productos = service.listar();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(productos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> buscar(
            @PathVariable Long id) {

        return service.buscar(id)
                .map(ResponseEntity::ok)
                .orElseGet(() ->
                    ResponseEntity.notFound().build()
                );
    }

    @PostMapping
    public ResponseEntity<Producto> crear(
            @RequestBody Producto producto) {

        Producto nuevo = service.crear(producto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(nuevo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Producto> actualizar(
            @PathVariable Long id,
            @RequestBody Producto producto) {

        return service.actualizar(id, producto)
                .map(ResponseEntity::ok)
                .orElseGet(() ->
                    ResponseEntity.notFound().build()
                );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long id) {

        if (service.eliminar(id)) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.notFound().build();
    }
}
