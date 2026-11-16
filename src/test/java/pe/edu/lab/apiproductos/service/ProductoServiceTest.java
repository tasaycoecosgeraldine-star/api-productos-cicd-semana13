
package pe.edu.lab.apiproductos.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.lab.apiproductos.model.Producto;

import static org.junit.jupiter.api.Assertions.*;

class ProductoServiceTest {

    private ProductoService productoService;

    @BeforeEach
    void configurar() {
        productoService = new ProductoService();
    }

    @Test
    void testListarProductos() {
        var productos = productoService.listar();

        assertEquals(2, productos.size());
    }

    @Test
    void testBuscarProductoExistente() {
        var resultado = productoService.buscar(1L);

        assertTrue(resultado.isPresent());
        assertEquals(1L, resultado.get().getId());
    }

    @Test
    void testBuscarProductoInexistente() {
        var resultado = productoService.buscar(999L);

        assertTrue(resultado.isEmpty());
    }

    @Test
    void testCrearProducto() {
        Producto producto = new Producto(
            null, "Monitor", 450.00, 10
        );

        Producto creado = productoService.crear(producto);

        assertNotNull(creado.getId());
        assertEquals(3L, creado.getId());
        assertTrue(
            productoService.buscar(creado.getId()).isPresent()
        );
    }

    @Test
    void testActualizarProducto() {
        Producto actualizado = new Producto(
            null, "Teclado Gamer", 120.00, 15
        );

        var resultado = productoService.actualizar(
            1L, actualizado
        );

        assertTrue(resultado.isPresent());
        assertEquals(1L, resultado.get().getId());
        assertTrue(productoService.buscar(1L).isPresent());
    }

    @Test
    void testActualizarProductoInexistente() {
        Producto producto = new Producto(
            null, "Monitor", 450.00, 10
        );

        var resultado = productoService.actualizar(
            999L, producto
        );

        assertTrue(resultado.isEmpty());
    }

    @Test
    void testEliminarProducto() {
        boolean eliminado = productoService.eliminar(2L);

        assertTrue(eliminado);
        assertTrue(productoService.buscar(2L).isEmpty());
    }

    @Test
    void testEliminarProductoInexistente() {
        boolean eliminado = productoService.eliminar(999L);

        assertFalse(eliminado);
    }


    @Test
    void testCrearProductosConIdsUnicos() {
        Producto producto1 = new Producto(
            null, "Monitor", 450.00, 10
        );

        Producto producto2 = new Producto(
            null, "Impresora", 650.00, 5
        );

        Producto creado1 = productoService.crear(producto1);
        Producto creado2 = productoService.crear(producto2);

        assertNotNull(creado1.getId());
        assertNotNull(creado2.getId());
        assertNotEquals(creado1.getId(), creado2.getId());
        assertEquals(3L, creado1.getId());
        assertEquals(4L, creado2.getId());
    }


    @Test
    void testActualizarNombreYPrecio() {
        Producto productoActualizado = new Producto(
            null, "Teclado Mecanico", 150.00, 12
        );

        var resultado = productoService.actualizar(
            1L, productoActualizado
        );

        assertTrue(resultado.isPresent());
        assertEquals(1L, resultado.get().getId());
        assertEquals("Teclado Mecanico",
            resultado.get().getNombre());
        assertEquals(150.00,
            resultado.get().getPrecio(), 0.001);
    }


    @Test
    void testBuscarProductoDespuesDeEliminar() {
        boolean eliminado = productoService.eliminar(1L);

        assertTrue(eliminado);
        assertTrue(productoService.buscar(1L).isEmpty());

        boolean eliminadoNuevamente =
            productoService.eliminar(1L);

        assertFalse(eliminadoNuevamente);
    }

}
