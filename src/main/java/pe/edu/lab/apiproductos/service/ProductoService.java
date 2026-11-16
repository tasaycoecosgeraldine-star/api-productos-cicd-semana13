package pe.edu.lab.apiproductos.service;

import pe.edu.lab.apiproductos.model.Producto;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ProductoService {

    private final Map<Long, Producto> productos = new ConcurrentHashMap<>();
    private final AtomicLong secuencia = new AtomicLong(2);

    public ProductoService() {
        productos.put(1L, new Producto(1L, "Teclado", 75.50, 20));
        productos.put(2L, new Producto(2L, "Mouse", 35.00, 30));
    }

    public List<Producto> listar() {
        return new ArrayList<>(productos.values());
    }

    public Optional<Producto> buscar(Long id) {
        return Optional.ofNullable(productos.get(id));
    }

    public Producto crear(Producto p) {
        Long id = secuencia.incrementAndGet();
        p.setId(id);
        productos.put(id, p);
        return p;
    }

    public Optional<Producto> actualizar(Long id, Producto p) {
        if (!productos.containsKey(id)) {
            return Optional.empty();
        }

        p.setId(id);
        productos.put(id, p);
        return Optional.of(p);
    }

    public boolean eliminar(Long id) {
        return productos.remove(id) != null;
    }
}
