"use client";

export default function QzTraySetupPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Guía de Configuración de QZ Tray</h1>
        <p className="text-gray-600">
          Configura la impresión automática para tu sistema POS
        </p>
      </div>

      {/* What is QZ Tray */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">¿Qué es QZ Tray?</h2>
        <p className="text-gray-700">
          QZ Tray es una aplicación de escritorio gratuita que permite a tu navegador imprimir directamente a impresoras locales y de red sin diálogos de confirmación.
        </p>
      </div>

      {/* Step 1: Install QZ Tray */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
          Instalar QZ Tray
        </h2>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Descarga QZ Tray desde: <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://qz.io/download/</a></li>
          <li>Instala la aplicación en tu computadora</li>
          <li>Inicia QZ Tray (aparecerá en la bandeja del sistema)</li>
        </ol>
        <a
          href="https://qz.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar QZ Tray
        </a>
      </div>

      {/* Step 2: Install Certificate */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
          Instalar el Certificado
        </h2>
        <p className="text-gray-600 mb-4">
          Este paso único habilita la impresión automática sin diálogos de confirmación repetidos.
        </p>

        {/* Method 1 */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Método 1: Descarga Automática (Recomendado)
          </h3>
          <ol className="list-decimal list-inside space-y-2 ml-7 text-sm mb-4">
            <li>Haz clic en el botón de abajo para descargar el certificado</li>
            <li>Guarda el archivo en tu computadora</li>
            <li>Abre QZ Tray desde la bandeja del sistema</li>
            <li>Ve a <strong>Settings (Configuración)</strong> → <strong>Certificates (Certificados)</strong> → <strong>Add Certificate (Agregar Certificado)</strong></li>
            <li>Selecciona el archivo descargado</li>
            <li>Haz clic en <strong>Add (Agregar)</strong></li>
          </ol>
          <a
            href="/api/qz/certificate"
            download="qz-certificate.pem"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Certificado
          </a>
        </div>

        {/* Method 2 */}
        <div>
          <h3 className="font-semibold mb-3">Método 2: Desde QZ Tray</h3>
          <ol className="list-decimal list-inside space-y-2 ml-7 text-sm">
            <li>Abre QZ Tray desde la bandeja del sistema</li>
            <li>Haz clic en <strong>Settings</strong> → <strong>Certificates</strong> → <strong>Add Certificate</strong></li>
            <li>En el cuadro de texto, pega esta URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">/api/qz/certificate</code></li>
            <li>Haz clic en <strong>Fetch</strong> para descargar el certificado</li>
            <li>Haz clic en <strong>Add</strong> para instalarlo</li>
          </ol>
        </div>
      </div>

      {/* Step 3: Allow Site Access */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
          Permitir Acceso al Sitio Web
        </h2>
        <p className="text-gray-600 mb-4">
          QZ Tray debe autorizar este sitio web para conectarse y usar las impresoras.
        </p>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Abre QZ Tray desde la bandeja del sistema</li>
          <li>Ve a <strong>Settings (Configuración)</strong> → <strong>Site Manager (Administrador de Sitios)</strong></li>
          <li>Haz clic en <strong>Add Site (Agregar Sitio)</strong></li>
          <li>Copia y pega esta URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">{typeof window !== "undefined" ? window.location.origin : "https://tu-sitio.vercel.app"}</code></li>
          <li>Marca la opción <strong>&quot;Trust this site&quot; (Confiar en este sitio)</strong></li>
          <li>Haz clic en <strong>Add (Agregar)</strong></li>
        </ol>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> Sin este paso, las impresoras USB no aparecerán en la lista y la impresión no funcionará.
          </p>
        </div>
      </div>

      {/* Step 4: Verify */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">4</span>
          Verificar Instalación
        </h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Actualiza esta página en tu navegador (F5)</li>
          <li>Ve a <strong>Dashboard</strong> → <strong>Configuración</strong> → <strong>Impresoras</strong></li>
          <li>Agrega tu impresora (de red o USB)</li>
          <li>Haz clic en <strong>Prueba de Impresión</strong></li>
          <li>La impresión debe ejecutarse <strong>sin ningún diálogo de confirmación</strong></li>
        </ol>
      </div>

      {/* Printer Setup */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Configuración de Impresoras
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Impresoras de Red</h3>
            <p className="text-sm text-gray-600 mb-2">
              Para impresoras conectadas a la red (más común en restaurantes):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Obtén la dirección IP de tu administrador de red</li>
              <li>Usa el puerto <strong>9100</strong> (puerto estándar para impresión raw)</li>
              <li>Ejemplo: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">192.168.1.100:9100</code></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Impresoras USB</h3>
            <p className="text-sm text-gray-600 mb-2">
              Para impresoras conectadas directamente por USB:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>La impresora aparecerá automáticamente en la lista</li>
              <li>Selecciónala del menú desplegable al agregar una impresora</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Solución de Problemas
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Error: &quot;Failed to sign request&quot;</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> El certificado no está instalado correctamente.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Elimina el certificado antiguo de QZ Tray Settings → Certificates</li>
              <li>Reinstala siguiendo el Paso 2</li>
              <li>Reinicia QZ Tray</li>
              <li>Actualiza tu navegador</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Error: &quot;QZ Tray no está conectado&quot;</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> La aplicación QZ Tray no está ejecutándose o el sitio no está autorizado.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Revisa la bandeja del sistema para el ícono de QZ Tray</li>
              <li>Si no está ejecutándose, inicia QZ Tray desde tu carpeta de Aplicaciones</li>
              <li>Verifica que el sitio web esté autorizado en QZ Tray Settings → Site Manager (ver Paso 3)</li>
              <li>Actualiza tu navegador</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">No Aparecen Impresoras USB</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> El sitio web no está autorizado en QZ Tray.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Abre QZ Tray desde la bandeja del sistema</li>
              <li>Ve a Settings → Site Manager</li>
              <li>Verifica que la URL de este sitio esté en la lista de sitios autorizados</li>
              <li>Si no está, agrégala siguiendo el Paso 3</li>
              <li>Actualiza tu navegador (F5) y vuelve a intentar</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Impresora No Encontrada</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> La impresora de red no es accesible o IP/puerto incorrectos.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Verifica que la dirección IP de la impresora sea correcta</li>
              <li>Haz ping a la impresora: Abre Símbolo del sistema y escribe <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ping 192.168.1.100</code> (usa la IP de tu impresora)</li>
              <li>Asegúrate de que el puerto 9100 esté abierto y la impresora esté en la red</li>
              <li>Intenta conectarte desde otro dispositivo para verificar la conectividad de red</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Security Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-sm font-semibold mb-2">Notas de Seguridad:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
          <li>El certificado es auto-firmado y único para este sistema POS</li>
          <li>Todas las solicitudes de impresión se firman en el servidor usando una clave privada</li>
          <li>El certificado habilita impresión segura y automática sin diálogos repetidos</li>
          <li>QZ Tray se comunica con tu navegador vía websocket local (ws://localhost:8182)</li>
        </ul>
      </div>

      {/* Support Links */}
      <div className="text-center text-sm text-gray-600">
        <p className="mb-2">Para ayuda adicional:</p>
        <p>
          <a href="https://qz.io/docs/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Documentación de QZ Tray
          </a>
          {" · "}
          <a href="https://github.com/qzind/tray/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Soporte de QZ Tray
          </a>
        </p>
      </div>
    </div>
  );
}
