# Manual del catálogo

Todo se administra desde **un archivo de Google Sheets** y **una carpeta de Google Drive**. No hay que tocar código.

> **Regla de oro:** editas la hoja → Google guarda solo → recargas la página y ya está el cambio (puede tardar hasta 1–2 minutos).

---

## 0. Instalación (se hace una sola vez)

1. Sube `plantilla-catalogo.xlsx` a Google Drive y ábrela.
2. **Archivo → Guardar como Hojas de cálculo de Google.** Trabaja siempre sobre esa copia nueva (puedes borrar el .xlsx).
3. **Compartir → Acceso general → "Cualquier persona con el enlace" → Lector.**
4. Copia el enlace del archivo y pégalo en `script.js`, en `SHEET_ID: ''` (entre las comillas).
5. En ese mismo bloque escribe el número en `WHATSAPP`.
6. En `index.html` cambia las dos URL `og:` por el dominio real. El logo es el archivo `logo.jpg`: para cambiarlo, reemplázalo por otro con el mismo nombre.
7. Sube `index.html`, `style.css`, `script.js` y `logo.jpg` al hosting (Netlify, GitHub Pages, Hostinger, etc.).

Las pestañas deben llamarse exactamente **Productos**, **Categorias** y **Banner**. No cambies los títulos de la fila 1.

---

## 1. Fotografías en Google Drive

### Subir una foto y obtener su enlace

1. Crea una carpeta en Drive, por ejemplo `Catálogo – Fotos`.
2. Clic derecho en la carpeta → **Compartir → "Cualquier persona con el enlace" → Lector.** Se hace una vez: todo lo que subas ahí queda visible.
3. Arrastra la foto a la carpeta.
4. Clic derecho en la foto → **Compartir → Copiar vínculo.**
5. Pega ese vínculo tal cual en la celda de Google Sheets. La página lo convierte sola.

### Reemplazar una foto

- **Opción A (recomendada):** sube la foto nueva, copia su vínculo y pégalo en la celda, encima del anterior.
- **Opción B:** clic derecho en la foto vieja → **Información del archivo → Gestionar versiones → Subir nueva versión.** El vínculo no cambia, así que no tocas la hoja (la imagen anterior puede seguir viéndose unas horas).

### Recomendaciones

| | Medida sugerida | Formato |
|---|---|---|
| Fotos de producto | 1200 × 1600 px (vertical 3:4) | JPG, menos de 500 KB |
| Imagen principal del banner | 2000 × 1000 px (horizontal) | JPG, menos de 800 KB |
| Fotos cuadradas del banner | 800 × 800 px | JPG |

Si una foto no aparece, casi siempre es porque no está compartida como "Cualquier persona con el enlace".

---

## 2. Productos — pestaña `Productos`

| Nombre | Categoría | Material | Tallas | Colores | Foto 1 | Foto 2 | Foto 3 | Foto 4 |
|---|---|---|---|---|---|---|---|---|
| Camisa Oxford | Camisas | 100% algodón | S,M,L,XL | Blanco, Azul | vínculo | vínculo | | |

| Quiero… | Hago esto |
|---|---|
| **Agregar un producto** | Escribo una fila nueva al final. Solo el Nombre es obligatorio. |
| **Eliminar un producto** | Clic derecho sobre el número de la fila → **Eliminar fila**. |
| **Cambiar nombre, material, tallas o colores** | Edito la celda. |
| **Cambiar una foto** | Pego el vínculo nuevo en Foto 1, 2, 3 o 4. |
| **Quitar una foto** | Borro el contenido de la celda. |

- **Foto 1** es la principal. Foto 2 aparece al pasar el mouse sobre la tarjeta.
- Tallas y colores van **separados por comas**: `S,M,L` · `Negro, Beige`.
- La Categoría debe escribirse igual que en la pestaña `Categorias` (mayúsculas y tildes no importan).
- Las columnas de esta pestaña deben estar en formato **Texto sin formato** (la plantilla ya viene así). Si creas la hoja desde cero: selecciona todo → Formato → Número → Texto sin formato. Evita que una talla como `32` desaparezca.

---

## 3. Categorías — pestaña `Categorias`

| Categoría | Activa | Orden |
|---|---|---|
| Camisas | TRUE | 1 |
| Pantalones | TRUE | 2 |
| Conjuntos | TRUE | 3 |

| Quiero… | Hago esto |
|---|---|
| **Crear una categoría** | Fila nueva: nombre, `TRUE` y un número de orden. Luego uso ese nombre en los productos. |
| **Cambiar el nombre** | Lo cambio aquí **y** en la columna Categoría de sus productos (Editar → Buscar y reemplazar lo hace de una). |
| **Ocultar una categoría** | Cambio Activa a `FALSE`. Sus productos también se ocultan. |
| **Eliminar una categoría** | Elimino la fila. |
| **Cambiar el orden** | Cambio los números de Orden: el menor va primero. |

"Todos" aparece siempre de primero, automáticamente. Una categoría con Activa vacía no se muestra.

---

## 4. Banner — pestaña `Banner`

| Campo | Valor |
|---|---|
| ImagenPrincipal | vínculo de Drive |
| Titulo | Nueva colección |
| Subtitulo | Prendas cómodas y versátiles |
| BotonTexto | Ver catálogo |
| BotonURL | (vacío = baja al catálogo) |
| Foto1 | vínculo de Drive |
| Foto2 | vínculo de Drive |
| Foto3 | vínculo de Drive |

Solo se edita la columna **Valor**. Si dejas un valor vacío, ese elemento no se muestra (sin `BotonTexto` no hay botón; sin fotos no hay cuadros).

---

## 5. WhatsApp

Está en un solo lugar: `script.js`, primeras líneas.

```js
WHATSAPP: '573001234567',
```

Código de país + número, solo dígitos, sin `+` ni espacios. Ahí mismo se cambian los textos de los mensajes.

---

## 6. Si algo falla

| Veo… | Reviso… |
|---|---|
| "No pudimos cargar el catálogo" | Que el Google Sheets esté como "Cualquier persona con el enlace" y que sea Hoja de Google, no .xlsx. |
| "Foto no disponible" | Que la foto (o su carpeta) esté compartida públicamente y que el vínculo esté completo. |
| Un producto no aparece | Que su Categoría exista en `Categorias` y esté en `TRUE`. |
| Una categoría no aparece | Que Activa diga `TRUE`. |
| El cambio no se ve | Espero un minuto y recargo la página. |
