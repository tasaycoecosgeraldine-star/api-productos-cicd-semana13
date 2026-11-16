
from pathlib import Path
from datetime import datetime
from html import escape
from collections import Counter
import xml.etree.ElementTree as ET
import json
import csv
import shutil

# =====================================================
# STOCKLAB QUALITY DASHBOARD
# Generador de reportes JUnit 5 + Maven
# =====================================================

BASE = Path(__file__).resolve().parent
ORIGEN = BASE / "target" / "surefire-reports"
DESTINO = BASE / "target" / "stocklab-dashboard"
REPORTES = DESTINO / "reportes-originales"

DESTINO.mkdir(parents=True, exist_ok=True)
REPORTES.mkdir(parents=True, exist_ok=True)

# =====================================================
# 1. DESCRIPCIONES DE LAS PRUEBAS
# =====================================================

DESCRIPCIONES = {
    "testListarProductos": (
        "Listar productos",
        "Verificar que el sistema muestre los productos registrados.",
        "El servicio debe devolver los 2 productos iniciales.",
        "Listado de productos"
    ),

    "testBuscarProductoExistente": (
        "Buscar producto existente",
        "Comprobar que se puede consultar un producto registrado.",
        "El producto con ID 1 debe existir.",
        "Consulta de productos"
    ),

    "testBuscarProductoInexistente": (
        "Buscar producto inexistente",
        "Comprobar el comportamiento cuando se busca un ID no registrado.",
        "La búsqueda debe devolver Optional vacío.",
        "Consulta de productos"
    ),

    "testCrearProducto": (
        "Registrar producto",
        "Verificar que se registre correctamente un nuevo producto.",
        "El producto debe recibir el ID 3 y quedar almacenado.",
        "Registro de productos"
    ),

    "testActualizarProducto": (
        "Actualizar producto",
        "Comprobar que se pueda actualizar un producto existente.",
        "La actualización debe conservar el ID 1.",
        "Actualización de productos"
    ),

    "testActualizarProductoInexistente": (
        "Actualizar producto inexistente",
        "Verificar el comportamiento ante una actualización de ID no registrado.",
        "El servicio debe devolver Optional vacío.",
        "Actualización de productos"
    ),

    "testEliminarProducto": (
        "Eliminar producto",
        "Comprobar que se pueda eliminar un producto registrado.",
        "El producto debe desaparecer y la operación devolver true.",
        "Eliminación de productos"
    ),

    "testEliminarProductoInexistente": (
        "Eliminar producto inexistente",
        "Verificar la eliminación de un ID que no existe.",
        "La operación debe devolver false.",
        "Eliminación de productos"
    ),

    "testCrearProductosConIdsUnicos": (
        "Generar identificadores únicos",
        "Verificar que dos productos nuevos reciban identificadores diferentes.",
        "Los productos deben recibir los ID 3 y 4.",
        "Integridad de datos"
    ),

    "testActualizarNombreYPrecio": (
        "Actualizar nombre y precio",
        "Comprobar que se guarden correctamente los nuevos datos.",
        "El ID debe mantenerse en 1, con nombre y precio actualizados.",
        "Actualización de productos"
    ),

    "testBuscarProductoDespuesDeEliminar": (
        "Buscar producto después de eliminarlo",
        "Verificar que un producto eliminado no pueda recuperarse.",
        "La búsqueda debe estar vacía y una segunda eliminación devolver false.",
        "Eliminación de productos"
    ),

    "contextLoads": (
        "Inicio de Spring Boot",
        "Comprobar que el contexto de Spring Boot se inicialice correctamente.",
        "La aplicación debe iniciar sin errores de configuración.",
        "Integración"
    )
}

# =====================================================
# 2. LEER RESULTADOS XML DE MAVEN
# =====================================================

if not ORIGEN.exists():
    raise SystemExit(
        "No existe target/surefire-reports. "
        "Ejecuta primero Maven: mvnw.cmd clean test"
    )

archivos = sorted(ORIGEN.glob("TEST-*.xml"))

if not archivos:
    raise SystemExit(
        "No hay archivos XML de JUnit para procesar."
    )

pruebas = []
suites = []

for archivo in archivos:
    raiz = ET.parse(archivo).getroot()

    nombre_suite = raiz.attrib.get(
        "name", archivo.stem
    ).split(".")[-1]

    casos = raiz.findall("./testcase")

    suites.append(nombre_suite)

    for caso in casos:
        nombre = caso.attrib.get("name", "Sin nombre")
        duracion = float(caso.attrib.get("time", "0"))

        fallo = caso.find("failure")
        error = caso.find("error")
        omitido = caso.find("skipped")

        estado = "APROBADO"
        detalle_error = ""

        if fallo is not None:
            estado = "FALLIDO"
            detalle_error = (
                fallo.attrib.get("message", "")
                or fallo.text
                or ""
            )

        elif error is not None:
            estado = "ERROR"
            detalle_error = (
                error.attrib.get("message", "")
                or error.text
                or ""
            )

        elif omitido is not None:
            estado = "OMITIDO"

        descripcion = DESCRIPCIONES.get(
            nombre,
            (
                nombre,
                "Verificación automatizada mediante JUnit.",
                "La aserción debe cumplirse.",
                "Otras pruebas"
            )
        )

        pruebas.append({
            "metodo": nombre,
            "titulo": descripcion[0],
            "objetivo": descripcion[1],
            "esperado": descripcion[2],
            "categoria": descripcion[3],
            "suite": nombre_suite,
            "duracion": duracion,
            "estado": estado,
            "detalle_error": detalle_error
        })

if not pruebas:
    raise SystemExit("No se encontraron pruebas.")

# =====================================================
# 3. CALCULAR MÉTRICAS
# =====================================================

total = len(pruebas)

aprobadas = sum(
    p["estado"] == "APROBADO"
    for p in pruebas
)

fallidas = sum(
    p["estado"] == "FALLIDO"
    for p in pruebas
)

errores = sum(
    p["estado"] == "ERROR"
    for p in pruebas
)

omitidas = sum(
    p["estado"] == "OMITIDO"
    for p in pruebas
)

porcentaje = aprobadas / total * 100

tiempo_total = sum(
    p["duracion"] for p in pruebas
)

resultado_general = (
    "APROBADO"
    if fallidas == 0 and errores == 0 and omitidas == 0
    else "REVISAR"
)

fecha = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

# =====================================================
# 4. GENERAR TARJETAS DETALLADAS
# =====================================================

tarjetas = ""

for numero, prueba in enumerate(pruebas, 1):

    estado = prueba["estado"]

    clase_estado = (
        "success" if estado == "APROBADO"
        else "warning" if estado == "OMITIDO"
        else "danger"
    )

    if estado == "APROBADO":
        resultado_texto = (
            "La prueba cumplió las aserciones "
            "establecidas en JUnit."
        )
    elif estado == "OMITIDO":
        resultado_texto = "La prueba fue omitida."
    else:
        resultado_texto = (
            "La prueba no cumplió las condiciones "
            "esperadas. Revisar el error."
        )

    detalle = ""

    if prueba["detalle_error"]:
        detalle = f"""
        <div class="error-box">
          <strong>Detalle del error:</strong>
          <pre>{escape(prueba['detalle_error'][:1500])}</pre>
        </div>
        """

    tarjetas += f"""
    <article class="test-card"
             data-status="{estado}"
             data-search="{escape(
                 (prueba['titulo'] + ' ' +
                  prueba['metodo'] + ' ' +
                  prueba['categoria']).lower(),
                 quote=True
             )}">

      <div class="test-header">
        <div>
          <span class="test-number">
            PRUEBA {numero:02d}
          </span>

          <h3>{escape(prueba['titulo'])}</h3>

          <span class="category">
            {escape(prueba['categoria'])}
          </span>
        </div>

        <span class="status {clase_estado}">
          {estado}
        </span>
      </div>

      <div class="test-information">

        <div class="information">
          <span>Objetivo</span>
          <p>{escape(prueba['objetivo'])}</p>
        </div>

        <div class="information">
          <span>Resultado esperado</span>
          <p>{escape(prueba['esperado'])}</p>
        </div>

        <div class="information">
          <span>Resultado de JUnit</span>
          <p>{resultado_texto}</p>
        </div>

      </div>

      {detalle}

      <div class="test-footer">
        <span>
          Método: {escape(prueba['metodo'])}
        </span>

        <strong>
          {prueba['duracion']:.3f} s
        </strong>
      </div>

    </article>
    """

# =====================================================
# 5. GENERAR GRÁFICOS POR SUITE
# =====================================================

graficos_suite = ""

for suite in sorted(set(suites)):

    registros = [
        p for p in pruebas
        if p["suite"] == suite
    ]

    cantidad = len(registros)

    exitos = sum(
        p["estado"] == "APROBADO"
        for p in registros
    )

    avance = exitos / cantidad * 100

    graficos_suite += f"""
    <div class="suite-item">
      <div class="suite-label">
        <span>{escape(suite)}</span>
        <strong>{exitos}/{cantidad}</strong>
      </div>

      <div class="progress">
        <div style="width:{avance:.2f}%"></div>
      </div>
    </div>
    """

# =====================================================
# 6. CONSTRUIR DASHBOARD HTML
# =====================================================

html = f"""<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>StockLab | Quality Dashboard</title>

<style>

:root {{
    --bg:#080E18;
    --sidebar:#0D1725;
    --card:#142033;
    --border:#27384D;
    --green:#B0E454;
    --text:#F2F7FF;
    --muted:#99ABC1;
    --red:#FF6B78;
}}

* {{
    box-sizing:border-box;
}}

body {{
    margin:0;
    background:var(--bg);
    color:var(--text);
    font-family:Segoe UI,Arial,sans-serif;
}}

header {{
    background:var(--sidebar);
    border-bottom:1px solid var(--border);
    padding:24px 6%;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:20px;
    flex-wrap:wrap;
}}

.logo {{
    font-size:25px;
    font-weight:900;
}}

.logo span {{
    color:var(--green);
}}

.subtitle {{
    font-size:12px;
    color:var(--muted);
    margin-top:6px;
}}

main {{
    max-width:1280px;
    margin:auto;
    padding:40px 25px;
}}

h1 {{
    font-size:38px;
    margin:0 0 10px;
}}

h2 {{
    font-size:22px;
    margin:0 0 22px;
}}

p {{
    line-height:1.6;
}}

.muted {{
    color:var(--muted);
}}

.badge {{
    padding:11px 18px;
    border-radius:30px;
    background:#294428;
    color:var(--green);
    font-weight:bold;
    font-size:12px;
}}

.metrics {{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:18px;
    margin:32px 0;
}}

.metric {{
    background:var(--card);
    padding:25px;
    border-radius:17px;
    border:1px solid var(--border);
}}

.metric strong {{
    display:block;
    color:var(--green);
    font-size:38px;
}}

.metric span {{
    color:var(--muted);
    font-size:13px;
}}

.grid {{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:35px;
}}

.panel {{
    background:var(--card);
    padding:28px;
    border:1px solid var(--border);
    border-radius:18px;
}}

.donut {{
    width:210px;
    height:210px;
    border-radius:50%;
    margin:20px auto;
    background:conic-gradient(
        var(--green) 0% {porcentaje:.2f}%,
        var(--red) {porcentaje:.2f}% 100%
    );
    display:flex;
    align-items:center;
    justify-content:center;
}}

.donut-inner {{
    background:var(--card);
    width:160px;
    height:160px;
    border-radius:50%;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
}}

.donut-inner strong {{
    font-size:36px;
}}

.donut-inner span {{
    color:var(--muted);
    font-size:13px;
}}

.suite-item {{
    margin:25px 0;
}}

.suite-label {{
    display:flex;
    justify-content:space-between;
    gap:15px;
    font-size:13px;
    margin-bottom:12px;
    overflow-wrap:anywhere;
}}

.progress {{
    height:12px;
    background:#29384A;
    border-radius:20px;
    overflow:hidden;
}}

.progress div {{
    height:100%;
    background:var(--green);
    border-radius:20px;
}}

.toolbar {{
    display:flex;
    gap:12px;
    flex-wrap:wrap;
    margin-bottom:25px;
}}

input,select,button {{
    background:#172539;
    color:white;
    border:1px solid var(--border);
    padding:13px 17px;
    border-radius:10px;
    font-size:13px;
}}

input {{
    flex:1;
    min-width:230px;
}}

button {{
    cursor:pointer;
}}

button:hover {{
    border-color:var(--green);
}}

.test-grid {{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:20px;
}}

.test-card {{
    background:var(--card);
    border:1px solid var(--border);
    border-radius:18px;
    padding:24px;
    min-width:0;
}}

.test-header {{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:15px;
}}

.test-number {{
    color:var(--green);
    font-size:11px;
    font-weight:bold;
}}

.test-header h3 {{
    margin:10px 0;
    font-size:19px;
}}

.category {{
    font-size:12px;
    color:var(--muted);
}}

.status {{
    font-size:10px;
    font-weight:800;
    border-radius:20px;
    padding:9px 12px;
    white-space:nowrap;
}}

.success {{
    background:#294428;
    color:var(--green);
}}

.danger {{
    background:#49232D;
    color:#FF8A95;
}}

.warning {{
    background:#544322;
    color:#FFD07D;
}}

.test-information {{
    margin-top:22px;
}}

.information {{
    margin-bottom:17px;
}}

.information span {{
    color:var(--green);
    font-size:11px;
    text-transform:uppercase;
    font-weight:bold;
}}

.information p {{
    color:#C8D5E5;
    font-size:13px;
    margin:7px 0;
}}

.test-footer {{
    border-top:1px solid var(--border);
    padding-top:17px;
    display:flex;
    justify-content:space-between;
    gap:12px;
    font-size:11px;
    color:var(--muted);
    overflow-wrap:anywhere;
}}

.error-box {{
    background:#3A1B25;
    color:#FFA4AE;
    padding:15px;
    border-radius:10px;
    margin-bottom:15px;
}}

pre {{
    white-space:pre-wrap;
    overflow-wrap:anywhere;
}}

footer {{
    text-align:center;
    color:var(--muted);
    font-size:12px;
    padding:40px;
}}

@media(max-width:850px) {{
    .metrics {{
        grid-template-columns:repeat(2,1fr);
    }}

    .grid,.test-grid {{
        grid-template-columns:1fr;
    }}
}}

@media(max-width:450px) {{
    .metrics {{
        grid-template-columns:1fr;
    }}

    h1 {{
        font-size:28px;
    }}
}}

@media print {{
    body {{
        background:white;
        color:black;
    }}

    header,.toolbar {{
        display:none;
    }}

    .panel,.metric,.test-card {{
        break-inside:avoid;
        border:1px solid #aaa;
    }}

    .information p,.muted {{
        color:#333;
    }}
}}

</style>

</head>

<body>

<header>

<div>
    <div class="logo">
        STOCK<span>LAB</span> / QA
    </div>

    <div class="subtitle">
        JUnit 5 · Spring Boot · Maven · GitHub Actions
    </div>
</div>

<div class="badge">{resultado_general}</div>

</header>

<main>

<h1>Quality Dashboard</h1>

<p class="muted">
    Informe detallado de pruebas automatizadas
    del sistema API Productos.
    Generado: {fecha}
</p>

<section class="metrics">

<div class="metric">
    <strong>{total}</strong>
    <span>Pruebas ejecutadas</span>
</div>

<div class="metric">
    <strong>{aprobadas}</strong>
    <span>Pruebas aprobadas</span>
</div>

<div class="metric">
    <strong>{fallidas + errores}</strong>
    <span>Fallos y errores</span>
</div>

<div class="metric">
    <strong>{porcentaje:.0f}%</strong>
    <span>Tasa de aprobación</span>
</div>

</section>

<section class="grid">

<div class="panel">

<h2>Distribución de resultados</h2>

<div class="donut">
    <div class="donut-inner">
        <strong>{porcentaje:.0f}%</strong>
        <span>APROBADAS</span>
    </div>
</div>

<p class="muted">
    {aprobadas} aprobadas ·
    {fallidas} fallidas ·
    {errores} errores ·
    {omitidas} omitidas
</p>

</div>

<div class="panel">

<h2>Resultados por suite</h2>

{graficos_suite}

<p class="muted">
    Tiempo acumulado de los casos:
    {tiempo_total:.3f} segundos
</p>

</div>

</section>

<section>

<h2>Detalle individual de pruebas JUnit</h2>

<p class="muted">
    Cada tarjeta describe el objetivo,
    el resultado esperado y el estado
    obtenido mediante Maven Surefire.
</p>

<div class="toolbar">

<input id="buscar"
       placeholder="Buscar prueba por nombre o categoría..."
       oninput="filtrar()">

<select id="estado" onchange="filtrar()">
    <option value="TODOS">Todos los estados</option>
    <option value="APROBADO">Aprobadas</option>
    <option value="FALLIDO">Fallidas</option>
    <option value="ERROR">Errores</option>
    <option value="OMITIDO">Omitidas</option>
</select>

<button onclick="window.print()">
    Imprimir / Guardar PDF
</button>

<button onclick="descargarCSV()">
    Exportar CSV
</button>

</div>

<div class="test-grid" id="pruebas">
{tarjetas}
</div>

</section>

</main>

<footer>
    StockLab Quality Dashboard ·
    Reporte basado en resultados reales
    de Maven Surefire
</footer>

<script>

const datos = {json.dumps(pruebas, ensure_ascii=False)};

function filtrar() {{
    const texto = document.getElementById(
        "buscar"
    ).value.toLowerCase();

    const estado = document.getElementById(
        "estado"
    ).value;

    document.querySelectorAll(".test-card")
        .forEach(tarjeta => {{

        const coincideTexto = tarjeta.dataset.search
            .includes(texto);

        const coincideEstado = (
            estado === "TODOS" ||
            tarjeta.dataset.status === estado
        );

        tarjeta.style.display = (
            coincideTexto && coincideEstado
        ) ? "" : "none";

    }});
}}

function descargarCSV() {{

    const columnas = [
        "Prueba", "Objetivo", "Esperado",
        "Estado", "Duracion"
    ];

    const escaparCSV = valor => (
        '"' + String(valor ?? "")
        .replace(/"/g, '""') + '"'
    );

    const filas = datos.map(p => [
        p.titulo,
        p.objetivo,
        p.esperado,
        p.estado,
        p.duracion
    ].map(escaparCSV).join(","));

    const contenido = "\\uFEFF" +
        [columnas.join(","), ...filas].join("\\r\\n");

    const blob = new Blob(
        [contenido],
        {{type:"text/csv;charset=utf-8"}}
    );

    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "stocklab-pruebas.csv";
    enlace.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}}

</script>

</body>
</html>
"""

# =====================================================
# 7. GUARDAR HTML Y JSON
# =====================================================

(DESTINO / "index.html").write_text(
    html, encoding="utf-8"
)

datos_json = {
    "proyecto": "StockLab",
    "fecha_generacion": fecha,
    "total": total,
    "aprobadas": aprobadas,
    "fallidas": fallidas,
    "errores": errores,
    "omitidas": omitidas,
    "porcentaje": porcentaje,
    "pruebas": pruebas
}

(DESTINO / "resultados.json").write_text(
    json.dumps(
        datos_json,
        ensure_ascii=False,
        indent=4
    ),
    encoding="utf-8"
)

# =====================================================
# 8. COPIAR REPORTES ORIGINALES
# =====================================================

for archivo in ORIGEN.iterdir():
    if archivo.is_file() and archivo.suffix in (".xml", ".txt"):
        shutil.copy2(
            archivo,
            REPORTES / archivo.name
        )

# =====================================================
# 9. CREAR ARCHIVO LEEME
# =====================================================

leeme = """STOCKLAB QUALITY DASHBOARD

CONTENIDO

index.html:
Reporte visual interactivo de las pruebas JUnit.

resultados.json:
Resultados estructurados obtenidos de Maven Surefire.

reportes-originales/:
Archivos XML y TXT generados por Maven.

INSTRUCCIONES

1. Extraer completamente el ZIP.
2. Abrir index.html en Chrome o Edge.
3. Consultar las 12 pruebas.
4. Utilizar los filtros o exportar a CSV.

El dashboard es independiente y no requiere Internet.

NOTA
Las descripciones de las pruebas se basan
en las aserciones definidas para el proyecto.
Los estados y tiempos provienen de los XML de JUnit.
"""

(DESTINO / "LEEME.txt").write_text(
    leeme, encoding="utf-8"
)

# =====================================================
# 10. RESUMEN DE GENERACIÓN
# =====================================================

print("=" * 55)
print("STOCKLAB QUALITY DASHBOARD")
print("=" * 55)
print(f"Pruebas ejecutadas: {total}")
print(f"Aprobadas: {aprobadas}")
print(f"Fallidas: {fallidas}")
print(f"Errores: {errores}")
print(f"Omitidas: {omitidas}")
print(f"Tasa de aprobación: {porcentaje:.2f}%")
print(f"HTML generado: {DESTINO / 'index.html'}")
print("=" * 55)
