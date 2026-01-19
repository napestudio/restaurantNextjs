"use client";

export default function GgEzPrintSetupPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Guía de Configuración de gg-ez-print</h1>
        <p className="text-gray-600">
          Configura la impresión automática para tu sistema POS
        </p>
      </div>

      {/* What is gg-ez-print */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">¿Qué es gg-ez-print?</h2>
        <p className="text-gray-700 mb-3">
          gg-ez-print es un servicio local que permite a tu navegador imprimir directamente a impresoras térmicas (USB y de red) sin diálogos de confirmación.
        </p>
        <p className="text-gray-700">
          Es una solución ligera y fácil de usar que se ejecuta en segundo plano y se comunica con tu navegador a través de WebSocket.
        </p>
      </div>

      {/* Step 1: Install gg-ez-print */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
          Instalar gg-ez-print
        </h2>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Descarga gg-ez-print desde: <a href="https://github.com/RenzoCostarelli/gg-ez-print/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Releases</a></li>
          <li>Descarga el archivo apropiado para tu sistema operativo:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><strong>Windows:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">gg-ez-print-windows.exe</code></li>
              <li><strong>Linux:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">gg-ez-print-linux</code></li>
              <li><strong>macOS:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">gg-ez-print-macos</code></li>
            </ul>
          </li>
          <li>Ejecuta el archivo descargado (el servicio se iniciará automáticamente en el puerto 8080)</li>
        </ol>
        <a
          href="https://github.com/RenzoCostarelli/gg-ez-print/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar gg-ez-print
        </a>
      </div>

      {/* Step 2: Verify Service */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
          Verificar que el Servicio Está Ejecutándose
        </h2>
        <p className="text-gray-600 mb-4">
          Asegúrate de que gg-ez-print esté ejecutándose en tu computadora.
        </p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Busca el ícono de gg-ez-print en la bandeja del sistema (Windows) o barra de menús (macOS)</li>
          <li>O verifica que el proceso esté ejecutándose:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><strong>Windows:</strong> Abre el Administrador de Tareas y busca &quot;gg-ez-print&quot;</li>
              <li><strong>Linux/macOS:</strong> Ejecuta <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ps aux | grep gg-ez-print</code></li>
            </ul>
          </li>
          <li>El servicio debe estar escuchando en <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ws://localhost:8080/ws</code></li>
        </ol>
      </div>

      {/* Step 3: Configure Printers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
          Configurar Impresoras en el Sistema
        </h2>
        <p className="text-gray-600 mb-4">
          Una vez que gg-ez-print esté ejecutándose, actualiza esta página y configura tus impresoras.
        </p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Actualiza esta página en tu navegador (F5)</li>
          <li>Ve a <strong>Dashboard</strong> → <strong>Configuración</strong> → <strong>Impresoras</strong></li>
          <li>Haz clic en <strong>Agregar Impresora</strong></li>
          <li>Selecciona el tipo de impresora:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><strong>Impresora de Red:</strong> Ingresa la dirección IP de la impresora (ejemplo: 192.168.1.100)</li>
              <li><strong>Impresora USB:</strong> Haz clic en &quot;Buscar Impresoras&quot; para detectar impresoras USB conectadas</li>
            </ul>
          </li>
          <li>Completa la configuración y haz clic en <strong>Guardar</strong></li>
          <li>Prueba la impresión haciendo clic en <strong>Prueba de Impresión</strong></li>
        </ol>
      </div>

      {/* Printer Setup Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Tipos de Impresoras
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Impresoras de Red (Network)</h3>
            <p className="text-sm text-gray-600 mb-2">
              Para impresoras conectadas a la red (más común en restaurantes):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Solo necesitas la <strong>dirección IP</strong> de la impresora</li>
              <li>El puerto 9100 es utilizado automáticamente por gg-ez-print</li>
              <li>Ejemplo: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">192.168.1.100</code></li>
              <li>Puedes obtener la IP de tu administrador de red o imprimiendo la configuración de red desde la impresora</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Impresoras USB</h3>
            <p className="text-sm text-gray-600 mb-2">
              Para impresoras conectadas directamente por USB:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>La impresora debe estar instalada en Windows/macOS/Linux</li>
              <li>Usa el botón <strong>&quot;Buscar Impresoras&quot;</strong> para detectar automáticamente las impresoras disponibles</li>
              <li>Selecciona la impresora del menú desplegable</li>
              <li>El nombre de la impresora debe coincidir <strong>exactamente</strong> con el nombre en el sistema operativo (sensible a mayúsculas)</li>
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
            <h3 className="font-semibold mb-2">Error: &quot;No conectado a gg-ez-print&quot;</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> El servicio gg-ez-print no está ejecutándose o no es accesible.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Verifica que gg-ez-print esté ejecutándose (busca en la bandeja del sistema o Administrador de Tareas)</li>
              <li>Si no está ejecutándose, inicia el archivo ejecutable de gg-ez-print</li>
              <li>Verifica que el servicio esté escuchando en el puerto 8080 (no debe haber otro servicio usando ese puerto)</li>
              <li>Actualiza tu navegador (F5)</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Error: &quot;Timeout esperando lista de impresoras&quot;</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> gg-ez-print no responde a la solicitud de listado.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Reinicia el servicio gg-ez-print</li>
              <li>Verifica que no haya errores en la consola de gg-ez-print</li>
              <li>Asegúrate de que tu firewall no esté bloqueando la conexión al puerto 8080</li>
              <li>Intenta acceder manualmente a <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ws://localhost:8080/ws</code> desde las herramientas de desarrollo del navegador</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">No Aparecen Impresoras USB al Buscar</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> Las impresoras no están instaladas en el sistema operativo o gg-ez-print no puede detectarlas.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Verifica que la impresora esté instalada correctamente en Windows/macOS/Linux</li>
              <li>Abre las configuraciones de impresoras del sistema operativo y confirma que la impresora aparece</li>
              <li>Asegúrate de que la impresora esté encendida y conectada por USB</li>
              <li>Reinicia gg-ez-print e intenta buscar nuevamente</li>
              <li>Si usas Linux, verifica que tu usuario tenga permisos para acceder a las impresoras</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Error al Imprimir en Impresora de Red</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> La impresora de red no es accesible o la dirección IP es incorrecta.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Verifica que la dirección IP de la impresora sea correcta</li>
              <li>Haz ping a la impresora: Abre Símbolo del sistema/Terminal y escribe <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ping 192.168.1.100</code> (usa la IP de tu impresora)</li>
              <li>Asegúrate de que la impresora esté en la misma red que tu computadora</li>
              <li>Verifica que el puerto 9100 esté abierto en el firewall</li>
              <li>Intenta imprimir desde otra aplicación para verificar que la impresora funcione</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Error al Imprimir en Impresora USB</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> El nombre de la impresora no coincide exactamente con el nombre del sistema.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Verifica que el nombre de la impresora en la configuración coincida <strong>exactamente</strong> con el nombre en el sistema operativo (incluyendo mayúsculas/minúsculas)</li>
              <li>Usa el botón &quot;Buscar Impresoras&quot; para obtener el nombre exacto</li>
              <li>Si acabas de instalar la impresora, reinicia gg-ez-print</li>
              <li>Verifica que la impresora no esté en uso por otra aplicación</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Esta impresora necesita ser reconfigurada con gg-ez-print</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Causa:</strong> La impresora fue creada antes de la migración a gg-ez-print y necesita actualización.</p>
            <p className="text-sm mb-1"><strong>Solución:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>Abre la configuración de la impresora haciendo clic en &quot;Editar&quot;</li>
              <li>Haz clic en &quot;Buscar Impresoras&quot; para detectar impresoras disponibles</li>
              <li>Selecciona la impresora correcta del menú desplegable</li>
              <li>Haz clic en &quot;Guardar&quot; para actualizar la configuración</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-sm font-semibold mb-2">Detalles Técnicos:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
          <li>gg-ez-print se comunica con el navegador a través de WebSocket en <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">ws://localhost:8080/ws</code></li>
          <li>Las impresoras de red usan el protocolo raw TCP en el puerto 9100</li>
          <li>Las impresoras USB utilizan los drivers del sistema operativo</li>
          <li>El servicio debe estar ejecutándose en la misma computadora que el navegador</li>
          <li>Los datos de impresión se envían usando el formato ESC/POS codificado en base64</li>
        </ul>
      </div>

      {/* Support Links */}
      <div className="text-center text-sm text-gray-600">
        <p className="mb-2">Para ayuda adicional:</p>
        <p>
          <a href="https://github.com/RenzoCostarelli/gg-ez-print" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Documentación de gg-ez-print
          </a>
          {" · "}
          <a href="https://github.com/RenzoCostarelli/gg-ez-print/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Reportar un Problema
          </a>
        </p>
      </div>
    </div>
  );
}
