
"use strict";

/* ============================================
   STOCKLAB 2.0
   CATALOGO DE PRODUCTOS
   CONEXION CON API REST SPRING BOOT
   ============================================ */

// CONFIGURACION GENERAL

const API_PRODUCTOS = "/api/productos";

const $ = id => document.getElementById(id);

let productos = [];

// FORMATO DE MONEDA PERUANA

const moneda = valor => {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN"
    }).format(Number(valor) || 0);
};

/* ============================================
   CONSULTAR PRODUCTOS DE LA API REST
   ============================================ */

async function cargar() {

    const botonActualizar = $("actualizar");

    botonActualizar.disabled = true;
    botonActualizar.textContent = "↻ Cargando...";

    $("estadoAPI").textContent = "● Consultando API";

    try {

        const respuesta = await fetch(API_PRODUCTOS, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error(
                "Error HTTP " + respuesta.status
            );
        }

        const tipoContenido =
            respuesta.headers.get("Content-Type") || "";

        if (!tipoContenido.includes("application/json")) {
            throw new Error(
                "La API no devolvió contenido JSON."
            );
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error(
                "La respuesta recibida no es una lista de productos."
            );
        }

        // ALMACENAR PRODUCTOS

        productos = datos.map(producto => ({
            id: producto.id,
            nombre: String(producto.nombre ?? ""),
            precio: Number(producto.precio) || 0,
            stock: Number(producto.stock) || 0
        }));

        // MOSTRAR ESTADO DE CONEXION

        $("estadoAPI").textContent = "● API conectada";

        $("estadoAPI").classList.remove("error");

        // ACTUALIZAR TABLA

        mostrar();

    } catch (error) {

        // ERROR DE CONEXION

        productos = [];

        $("estadoAPI").textContent = "● Error de API";

        $("estadoAPI").classList.add("error");

        const tabla = $("tabla");

        tabla.replaceChildren();

        const mensaje = $("sinDatos");

        mensaje.textContent =
            "No se pudieron cargar los productos: " +
            error.message;

        mensaje.hidden = false;

        console.error(
            "StockLab - Error al consultar productos:",
            error
        );

    } finally {

        botonActualizar.disabled = false;

        botonActualizar.textContent = "↻ Actualizar";
    }
}

/* ============================================
   CREAR CELDAS DE FORMA SEGURA
   ============================================ */

function crearCelda(fila, contenido, clase = "") {

    const celda = document.createElement("td");

    // textContent evita interpretar HTML
    // ingresado en el nombre del producto.

    celda.textContent = String(contenido);

    if (clase) {
        celda.className = clase;
    }

    fila.appendChild(celda);

    return celda;
}

/* ============================================
   DETERMINAR ESTADO DEL STOCK
   ============================================ */

function obtenerEstadoStock(stock) {

    if (stock === 0) {
        return "empty";
    }

    if (stock <= 5) {
        return "low";
    }

    return "available";
}

/* ============================================
   MOSTRAR PRODUCTOS EN LA TABLA
   ============================================ */

function mostrar() {

    const textoBusqueda = $("buscar")
        .value.trim().toLowerCase();

    // FILTRAR POR NOMBRE O IDENTIFICADOR

    const filtrados = productos.filter(producto => {

        const nombre = producto.nombre.toLowerCase();

        const id = String(producto.id);

        return (
            nombre.includes(textoBusqueda) ||
            id.includes(textoBusqueda)
        );
    });

    const tabla = $("tabla");

    tabla.replaceChildren();

    // GENERAR FILAS

    filtrados.forEach(producto => {

        const fila = document.createElement("tr");

        // IDENTIFICADOR

        crearCelda(
            fila,
            "#" + producto.id
        );

        // NOMBRE DEL PRODUCTO

        crearCelda(
            fila,
            producto.nombre,
            "name"
        );

        // PRECIO EN SOLES

        crearCelda(
            fila,
            moneda(producto.precio)
        );

        // ESTADO Y CANTIDAD

        const celdaStock = document.createElement("td");

        const etiqueta = document.createElement("span");

        etiqueta.className = "stock";

        const estado = obtenerEstadoStock(producto.stock);

        if (estado === "low") {
            etiqueta.classList.add("low");
        }

        if (estado === "empty") {
            etiqueta.classList.add("empty");
        }

        etiqueta.textContent =
            producto.stock + " unidades";

        celdaStock.appendChild(etiqueta);

        fila.appendChild(celdaStock);

        tabla.appendChild(fila);
    });

    // MENSAJE SI NO HAY COINCIDENCIAS

    const sinDatos = $("sinDatos");

    sinDatos.textContent =
        "No se encontraron productos.";

    sinDatos.hidden = filtrados.length > 0;
}

/* ============================================
   EVENTOS DEL CATALOGO
   ============================================ */

// BUSCAR PRODUCTOS EN TIEMPO REAL

$("buscar").addEventListener("input", mostrar);

// ACTUALIZAR DATOS DESDE LA API

$("actualizar").addEventListener("click", cargar);

/* ============================================
   INICIAR CATALOGO
   ============================================ */

cargar();
