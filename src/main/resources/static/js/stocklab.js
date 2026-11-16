
"use strict";

// ============================================
// STOCKLAB 2.0 PREMIUM
// FUNCIONALIDADES DEL SISTEMA
// ============================================

// CONFIGURACIÓN DE LA API

const API = "/api/productos";

const $ = id => document.getElementById(id);

let productos = [];
let idEdicion = null;
let vistaActual = "dashboard";
let ultimoBotonModal = null;

// FORMATO DE MONEDA PERUANA

const moneda = valor => {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
};

// ============================================
// COMUNICACIÓN CON LA API REST
// ============================================

async function solicitar(url, opciones = {}) {

    const headers = new Headers(opciones.headers || {});

    // La API debe devolver JSON, no productos.html
    headers.set("Accept", "application/json");

    const respuesta = await fetch(url, {
        ...opciones,
        headers
    });

    if (!respuesta.ok) {
        throw new Error(
            "Error HTTP " + respuesta.status
        );
    }

    if (respuesta.status === 204) {
        return null;
    }

    const tipo = respuesta.headers.get("Content-Type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error(
            "La API no devolvió información JSON."
        );
    }

    return respuesta.json();
}

// CARGAR PRODUCTOS

async function cargarProductos() {

    try {

        const datos = await solicitar(API);

        if (!Array.isArray(datos)) {
            throw new Error(
                "La respuesta de la API no es una lista."
            );
        }

        productos = datos.map(p => ({
            id: p.id,
            nombre: String(p.nombre ?? ""),
            precio: Number(p.precio) || 0,
            stock: Number(p.stock) || 0
        }));

        $("apiStatus").textContent = "● API conectada";
        $("apiStatus").classList.remove("offline");

        renderizarTodo();

        return true;

    } catch (error) {

        $("apiStatus").textContent = "● API desconectada";
        $("apiStatus").classList.add("offline");

        avisar(
            "No se pudo conectar con la API: " +
            error.message,
            true
        );

        return false;
    }
}

// ============================================
// MENSAJES DEL SISTEMA
// ============================================

function avisar(mensaje, esError = false) {

    const aviso = $("notice");

    aviso.textContent = mensaje;
    aviso.className = esError
        ? "notice error"
        : "notice";

    aviso.hidden = false;
}

function ocultarAviso() {
    $("notice").hidden = true;
}

// ============================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================

function cambiarVista(vista) {

    const vistasPermitidas = [
        "dashboard",
        "inventario",
        "resumen"
    ];

    if (!vistasPermitidas.includes(vista)) {
        vista = "dashboard";
    }

    vistaActual = vista;

    $("vistaDashboard").hidden =
        vista !== "dashboard";

    $("vistaInventario").hidden =
        vista !== "inventario";

    $("vistaResumen").hidden =
        vista !== "resumen";

    $("navDashboard").classList.toggle(
        "active",
        vista === "dashboard"
    );

    $("navInventario").classList.toggle(
        "active",
        vista === "inventario"
    );

    $("navResumen").classList.toggle(
        "active",
        vista === "resumen"
    );

    renderizarTodo();

    window.scrollTo({
        top: 0,
        behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches ? "instant" : "smooth"
    });
}

// ============================================
// ESTADÍSTICAS DEL INVENTARIO
// ============================================

function estadisticas() {

    const total = productos.length;

    const unidades = productos.reduce(
        (suma, producto) =>
            suma + producto.stock,
        0
    );

    const valor = productos.reduce(
        (suma, producto) =>
            suma + producto.precio * producto.stock,
        0
    );

    const disponibles = productos.filter(
        producto => producto.stock > 5
    ).length;

    const bajo = productos.filter(
        producto =>
            producto.stock > 0 &&
            producto.stock <= 5
    ).length;

    const agotados = productos.filter(
        producto => producto.stock === 0
    ).length;

    return {
        total,
        unidades,
        valor,
        disponibles,
        bajo,
        agotados
    };
}

// ============================================
// ESTADO DE LOS PRODUCTOS
// ============================================

function estadoStock(stock) {

    if (stock === 0) {
        return {
            texto: "Agotado",
            clase: "empty-stock"
        };
    }

    if (stock <= 5) {
        return {
            texto: "Stock bajo",
            clase: "low"
        };
    }

    return {
        texto: "Disponible",
        clase: "available"
    };
}

// ============================================
// CREACIÓN SEGURA DE ELEMENTOS
// ============================================

function crearCelda(fila, contenido, clase = "") {

    const celda = document.createElement("td");

    celda.textContent = String(contenido);

    if (clase) {
        celda.className = clase;
    }

    fila.appendChild(celda);

    return celda;
}

function crearAcciones(fila, producto) {

    const celda = document.createElement("td");

    const botonEditar = document.createElement("button");

    botonEditar.type = "button";
    botonEditar.className = "table-action";
    botonEditar.textContent = "✎ Editar";

    botonEditar.addEventListener("click", () => {
        abrirEdicion(producto.id);
    });

    const botonEliminar = document.createElement("button");

    botonEliminar.type = "button";
    botonEliminar.className = "table-action delete";
    botonEliminar.textContent = "✕ Eliminar";

    botonEliminar.addEventListener("click", () => {
        eliminarProducto(producto.id);
    });

    celda.append(botonEditar, botonEliminar);

    fila.appendChild(celda);
}

function crearEtiquetaEstado(fila, stock) {

    const celda = document.createElement("td");
    const etiqueta = document.createElement("span");

    const estado = estadoStock(stock);

    etiqueta.className =
        "pill " + estado.clase;

    etiqueta.textContent = estado.texto;

    celda.appendChild(etiqueta);
    fila.appendChild(celda);
}

// ============================================
// DASHBOARD
// ============================================

function renderizarDashboard() {

    const datos = estadisticas();

    $("dashProductos").textContent =
        datos.total;

    $("dashStock").textContent =
        datos.unidades;

    $("dashValor").textContent =
        moneda(datos.valor);

    $("dashBajo").textContent =
        datos.bajo;

    // Tarjetas junto al panda

    $("floatingProducts").textContent =
        datos.total;

    $("floatingStock").textContent =
        datos.unidades;

    const busqueda = $("buscarDashboard")
        .value.trim().toLowerCase();

    const filtrados = productos.filter(
        producto => {

            return (
                producto.nombre.toLowerCase()
                    .includes(busqueda) ||
                String(producto.id).includes(busqueda)
            );
        }
    );

    const tabla = $("tablaDashboard");

    tabla.replaceChildren();

    filtrados.forEach(producto => {

        const fila = document.createElement("tr");

        crearCelda(
            fila,
            "#" + producto.id,
            "product-id"
        );

        crearCelda(
            fila,
            producto.nombre,
            "product-name"
        );

        crearCelda(
            fila,
            moneda(producto.precio)
        );

        crearCelda(
            fila,
            producto.stock + " unidades"
        );

        crearAcciones(fila, producto);

        tabla.appendChild(fila);
    });

    $("dashboardVacio").hidden =
        filtrados.length > 0;
}

// ============================================
// INVENTARIO
// ============================================

function renderizarInventario() {

    const datos = estadisticas();

    $("invProductos").textContent =
        datos.total;

    $("invBajo").textContent =
        datos.bajo;

    $("invAgotados").textContent =
        datos.agotados;

    const busqueda = $("buscarInventario")
        .value.trim().toLowerCase();

    const filtro = $("filtroStock").value;

    const filtrados = productos.filter(
        producto => {

            const coincideBusqueda =
                producto.nombre.toLowerCase()
                    .includes(busqueda) ||
                String(producto.id).includes(busqueda);

            let coincideEstado = true;

            if (filtro === "disponibles") {
                coincideEstado = producto.stock > 5;
            }

            if (filtro === "bajo") {
                coincideEstado =
                    producto.stock > 0 &&
                    producto.stock <= 5;
            }

            if (filtro === "agotados") {
                coincideEstado =
                    producto.stock === 0;
            }

            return coincideBusqueda && coincideEstado;
        }
    );

    const tabla = $("tablaInventario");

    tabla.replaceChildren();

    filtrados.forEach(producto => {

        const fila = document.createElement("tr");

        crearCelda(
            fila,
            "#" + producto.id,
            "product-id"
        );

        crearCelda(
            fila,
            producto.nombre,
            "product-name"
        );

        crearCelda(
            fila,
            moneda(producto.precio)
        );

        crearCelda(
            fila,
            producto.stock + " unidades"
        );

        crearEtiquetaEstado(
            fila,
            producto.stock
        );

        crearAcciones(fila, producto);

        tabla.appendChild(fila);
    });

    $("inventarioVacio").hidden =
        filtrados.length > 0;
}

// ============================================
// RESUMEN INTELIGENTE
// ============================================

function renderizarResumen() {

    const datos = estadisticas();

    $("resProductos").textContent =
        datos.total;

    $("resUnidades").textContent =
        datos.unidades;

    $("resValor").textContent =
        moneda(datos.valor);

    $("resBajo").textContent =
        datos.bajo;

    $("leyendaDisponibles").textContent =
        datos.disponibles;

    $("leyendaBajo").textContent =
        datos.bajo;

    $("leyendaAgotados").textContent =
        datos.agotados;

    renderizarBarras();
    renderizarGraficoCircular(datos);
}

// ============================================
// GRÁFICO DE BARRAS SIN ESTILOS INLINE
// ============================================

function renderizarBarras() {

    const grafico = $("graficoBarras");

    grafico.replaceChildren();

    if (productos.length === 0) {

        const mensaje = document.createElement("p");

        mensaje.textContent =
            "No existen productos registrados.";

        grafico.appendChild(mensaje);
        return;
    }

    const ordenados = [...productos].sort(
        (a, b) => b.stock - a.stock
    );

    const maximo = Math.max(
        1,
        ...ordenados.map(producto => producto.stock)
    );

    ordenados.forEach(producto => {

        const item = document.createElement("div");
        item.className = "chart-item";

        const etiqueta = document.createElement("div");
        etiqueta.className = "chart-label";

        const nombre = document.createElement("span");
        nombre.textContent = producto.nombre;

        const cantidad = document.createElement("span");
        cantidad.textContent =
            producto.stock + " unidades";

        etiqueta.append(nombre, cantidad);

        // Utilizamos progress para evitar style.width

        const barra = document.createElement("progress");

        barra.className = "stock-progress";

        barra.max = maximo;
        barra.value = producto.stock;

        barra.setAttribute(
            "aria-label",
            "Existencias de " + producto.nombre
        );

        item.append(etiqueta, barra);

        grafico.appendChild(item);
    });
}

// ============================================
// GRÁFICO CIRCULAR SVG
// COMPATIBLE CON CSP RESTRICTIVA
// ============================================

function crearElementoSVG(nombre) {

    return document.createElementNS(
        "http://www.w3.org/2000/svg",
        nombre
    );
}

function renderizarGraficoCircular(datos) {

    const contenedor = $("graficoDonut");

    // Crear gráfico SVG mediante DOM seguro
    const svg = crearElementoSVG("svg");

    svg.setAttribute("viewBox", "0 0 220 220");
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        "Distribución de productos por estado"
    );
    svg.classList.add("donut-svg");

    // Radio y circunferencia
    const radio = 78;
    const circunferencia = 2 * Math.PI * radio;

    const crearCirculo = clase => {

        const circulo = crearElementoSVG("circle");

        circulo.setAttribute("cx", "110");
        circulo.setAttribute("cy", "110");
        circulo.setAttribute("r", String(radio));

        circulo.classList.add(clase);

        return circulo;
    };

    const fondo = crearCirculo("donut-track");

    svg.appendChild(fondo);

    const segmentos = [
        {
            cantidad: datos.disponibles,
            clase: "segment-available"
        },
        {
            cantidad: datos.bajo,
            clase: "segment-low"
        },
        {
            cantidad: datos.agotados,
            clase: "segment-empty"
        }
    ];

    let acumulado = 0;

    segmentos.forEach(segmento => {

        if (datos.total === 0 || segmento.cantidad === 0) {
            return;
        }

        const longitud =
            segmento.cantidad / datos.total *
            circunferencia;

        const circulo = crearCirculo("donut-segment");

        circulo.classList.add(segmento.clase);

        circulo.setAttribute(
            "stroke-dasharray",
            `${longitud} ${circunferencia}`
        );

        circulo.setAttribute(
            "stroke-dashoffset",
            String(-acumulado)
        );

        acumulado += longitud;

        svg.appendChild(circulo);
    });

    // Texto central en SVG
    const textoTotal = crearElementoSVG("text");

    textoTotal.setAttribute("x", "110");
    textoTotal.setAttribute("y", "108");
    textoTotal.setAttribute("text-anchor", "middle");
    textoTotal.setAttribute("font-size", "33");
    textoTotal.setAttribute("font-weight", "800");
    textoTotal.setAttribute("fill", "#57300F");

    textoTotal.textContent = String(datos.total);

    const textoEtiqueta = crearElementoSVG("text");

    textoEtiqueta.setAttribute("x", "110");
    textoEtiqueta.setAttribute("y", "132");
    textoEtiqueta.setAttribute("text-anchor", "middle");
    textoEtiqueta.setAttribute("font-size", "13");
    textoEtiqueta.setAttribute("fill", "#95704D");

    textoEtiqueta.textContent = "Productos";

    svg.append(textoTotal, textoEtiqueta);

    // Reemplazar el gráfico antiguo
    contenedor.replaceWith(svg);

    svg.id = "graficoDonut";

    // El total visual está ahora dentro del SVG.
    // Ya no se necesita el elemento HTML original.
}

// ============================================
// RENDERIZAR TODA LA APLICACIÓN
// ============================================

function renderizarTodo() {

    renderizarDashboard();
    renderizarInventario();
    renderizarResumen();
}

// ============================================
// FORMULARIO DE PRODUCTOS
// ============================================

function abrirNuevo() {

    ultimoBotonModal = document.activeElement;

    idEdicion = null;

    $("modalTitulo").textContent =
        "Nuevo producto";

    $("btnGuardar").textContent =
        "Registrar producto";

    $("formProducto").reset();

    $("modalProducto").classList.add("open");

    $("nombre").focus();
}

// ABRIR EDICIÓN

function abrirEdicion(id) {

    const producto = productos.find(
        p => String(p.id) === String(id)
    );

    if (!producto) {
        avisar("Producto no encontrado.", true);
        return;
    }

    ultimoBotonModal = document.activeElement;

    idEdicion = id;

    $("modalTitulo").textContent =
        "Editar producto";

    $("btnGuardar").textContent =
        "Guardar cambios";

    $("nombre").value =
        producto.nombre;

    $("precio").value =
        producto.precio;

    $("stock").value =
        producto.stock;

    $("modalProducto").classList.add("open");

    $("nombre").focus();
}

// CERRAR MODAL

function cerrarModal() {

    $("modalProducto").classList.remove("open");

    idEdicion = null;

    if (
        ultimoBotonModal &&
        ultimoBotonModal.isConnected &&
        typeof ultimoBotonModal.focus === "function"
    ) {
        ultimoBotonModal.focus();
    }
}

// ============================================
// REGISTRAR Y ACTUALIZAR PRODUCTOS
// ============================================

async function guardarProducto(evento) {

    evento.preventDefault();

    const nombre = $("nombre").value.trim();

    const precio = Number($("precio").value);

    const stock = Number($("stock").value);

    if (
        !nombre ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        avisar(
            "Verifica los datos del producto.",
            true
        );

        return;
    }

    const producto = {
        nombre,
        precio,
        stock
    };

    const editando = idEdicion !== null;

    const url = editando
        ? API + "/" + encodeURIComponent(idEdicion)
        : API;

    const boton = $("btnGuardar");

    boton.disabled = true;

    try {

        await solicitar(url, {
            method: editando ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        cerrarModal();

        const actualizado = await cargarProductos();

        if (actualizado) {
            avisar(
                editando
                    ? "Producto actualizado correctamente."
                    : "Producto registrado correctamente."
            );
        }

    } catch (error) {

        avisar(
            "No se pudo guardar el producto: " +
            error.message,
            true
        );

    } finally {

        boton.disabled = false;
    }
}

// ============================================
// ELIMINAR PRODUCTOS
// ============================================

async function eliminarProducto(id) {

    const confirmado = window.confirm(
        "¿Seguro que deseas eliminar el producto #" +
        id + "?"
    );

    if (!confirmado) {
        return;
    }

    try {

        await solicitar(
            API + "/" + encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );

        const actualizado = await cargarProductos();

        if (actualizado) {
            avisar(
                "Producto eliminado correctamente."
            );
        }

    } catch (error) {

        avisar(
            "No se pudo eliminar el producto: " +
            error.message,
            true
        );
    }
}

// ============================================
// EXPORTAR INVENTARIO A CSV
// ============================================

function exportarCSV() {

    function escaparCSV(valor) {

        const texto = String(valor);

        // Evita que hojas de cálculo interpreten
        // valores del usuario como fórmulas.
        const seguro = /^[=+\-@\t\r]/.test(texto)
            ? "'" + texto
            : texto;

        return '"' +
            seguro.replace(/"/g, '""') +
            '"';
    }

    const filas = [
        [
            "ID",
            "Producto",
            "Precio",
            "Stock",
            "Valor total"
        ]
    ];

    productos.forEach(producto => {

        filas.push([
            producto.id,
            producto.nombre,
            producto.precio.toFixed(2),
            producto.stock,
            (
                producto.precio * producto.stock
            ).toFixed(2)
        ]);
    });

    const contenido = filas.map(
        fila => fila.map(escaparCSV).join(";")
    ).join("\r\n");

    const archivo = new Blob(
        ["\uFEFF" + contenido],
        {
            type: "text/csv;charset=utf-8"
        }
    );

    const url = URL.createObjectURL(archivo);

    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "StockLab_Inventario.csv";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

// ============================================
// EVENTOS DE NAVEGACIÓN
// ============================================

$("navDashboard").addEventListener("click", () => {
    cambiarVista("dashboard");
});

$("navInventario").addEventListener("click", () => {
    cambiarVista("inventario");
});

$("navResumen").addEventListener("click", () => {
    cambiarVista("resumen");
});

$("btnVerInventario").addEventListener("click", () => {
    cambiarVista("inventario");
});

// ============================================
// EVENTOS DE REGISTRO
// ============================================

$("btnNuevoTop").addEventListener(
    "click", abrirNuevo
);

$("btnNuevoHero").addEventListener(
    "click", abrirNuevo
);

$("btnNuevoDashboard").addEventListener(
    "click", abrirNuevo
);

$("btnNuevoInventario").addEventListener(
    "click", abrirNuevo
);

$("btnCancelar").addEventListener(
    "click", cerrarModal
);

$("formProducto").addEventListener(
    "submit", guardarProducto
);

// ============================================
// EVENTOS DE BÚSQUEDA Y FILTROS
// ============================================

$("buscarDashboard").addEventListener(
    "input", renderizarDashboard
);

$("buscarInventario").addEventListener(
    "input", renderizarInventario
);

$("filtroStock").addEventListener(
    "change", renderizarInventario
);

// ============================================
// EVENTOS DE ACTUALIZACIÓN
// ============================================

$("btnActualizarInventario").addEventListener(
    "click", cargarProductos
);

$("btnActualizarResumen").addEventListener(
    "click", cargarProductos
);

$("btnExportar").addEventListener(
    "click", exportarCSV
);

// ============================================
// CERRAR FORMULARIO
// ============================================

$("modalProducto").addEventListener(
    "click",
    evento => {

        if (
            evento.target === $("modalProducto")
        ) {
            cerrarModal();
        }
    }
);

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Escape" &&
            $("modalProducto").classList.contains("open")
        ) {
            cerrarModal();
        }
    }
);

// ============================================
// INICIALIZACIÓN
// ============================================


// ============================================
// INICIALIZACIÓN Y NAVEGACIÓN
// ============================================

const parametros = new URLSearchParams(
    window.location.search
);

const vistaSolicitada = parametros.get("vista");

if (
    vistaSolicitada === "inventario" ||
    vistaSolicitada === "resumen"
) {
    cambiarVista(vistaSolicitada);
} else {
    cambiarVista("dashboard");
}

// Cargar productos desde Spring Boot
cargarProductos();
