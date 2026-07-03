# BC3 Viewer Multiplataforma

Esta es la versión autónoma y multiplataforma del **Visualizador y Editor de Presupuestos BC3 (FIEBDC-3)**. 

A diferencia del repositorio original `BC3php`, esta aplicación ha sido migrada para funcionar **100% en el lado del cliente (Offline)**. El parser original de PHP ha sido portado íntegramente a JavaScript (`BC3Parser.js`), lo que permite empaquetar y compilar la aplicación para **Windows (Escritorio)** y **Android (Móvil)** de forma nativa sin requerir servidores locales.

---

## Estructura del Proyecto

*   `/www`: Contiene el código frontend estático (HTML, CSS, JS) y las librerías locales (`chart.js`, `SheetJS`, `jsPDF`). Es el código fuente compartido para todas las plataformas.
    *   `www/index.html`: La interfaz principal adaptada de la versión web.
    *   `www/BC3Parser.js`: El parser BC3 portado a JavaScript.
    *   `www/app.js`: La lógica de la aplicación que carga los archivos localmente mediante la API `FileReader`.
*   `.gitignore`: Filtra archivos de compilación de Windows, Android, carpetas de dependencias y logs.
*   `package.json`: Administrador de dependencias y scripts de construcción.

---

## Ejecución y Empaquetado

### Requisitos Previos
*   Instalar [Node.js](https://nodejs.org/) (versión LTS recomendada).

### 1. Probar en Local (Navegador)
Puedes ejecutar o abrir directamente el archivo `www/index.html` en cualquier navegador moderno sin necesidad de ningún servidor o proceso especial. Todo el procesamiento de los archivos `.bc3` es local y privado.

---

### 2. Compilar para Windows (Tauri)

Tauri permite envolver la carpeta `www` en un ejecutable Windows ultra-ligero (3-5 MB) que consume mínimos recursos.

#### Requisitos adicionales:
1.  Instalar [Build Tools para Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (con soporte de C++).
2.  Instalar [Rust](https://www.rust-lang.org/).

#### Pasos:
1.  Inicializar Tauri en el proyecto:
    ```bash
    npx tauri init
    ```
    *Durante el asistente:*
    *   ¿Dónde está tu frontend?: `../www`
    *   ¿Dónde se inicia el servidor de desarrollo?: `../www` (o pulsa enter)
2.  Para iniciar la aplicación en modo desarrollo:
    ```bash
    npm run tauri:dev
    ```
3.  Para construir el ejecutable final (`.exe` y `.msi` instalable):
    ```bash
    npm run tauri:build
    ```
    *(El ejecutable compilado se guardará en `src-tauri/target/release/bundle/`)*

---

### 3. Compilar para Android (Capacitor)

Capacitor envuelve la carpeta `www` en un contenedor nativo de Android capaz de ejecutarse offline en tablets y teléfonos móviles.

#### Requisitos adicionales:
1.  Instalar [Android Studio](https://developer.android.com/studio) y configurar el SDK de Android.

#### Pasos:
1.  Instalar las dependencias de Node:
    ```bash
    npm install
    ```
2.  Inicializar Capacitor en el proyecto:
    ```bash
    npx cap init "BC3 Viewer" "com.tudominio.bc3viewer" --web-dir=www
    ```
3.  Agregar la plataforma Android:
    ```bash
    npm install @capacitor/android
    npx cap add android
    ```
4.  Sincronizar el código web en el proyecto nativo de Android:
    ```bash
    npx cap sync
    ```
5.  Abrir el proyecto en Android Studio para generar el archivo APK o AAB firmado:
    ```bash
    npx cap open android
    ```
    *(Desde Android Studio, ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**)*
