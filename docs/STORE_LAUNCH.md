# ProVendor — Lanzamiento en App Store y Google Play

Estado del repo: ✅ = ya hecho en el código · 👤 = lo tienen que hacer ustedes (requiere sus cuentas, dinero o decisiones).

---

## 0. Resumen de lo ya preparado en el código (✅)

- ✅ Íconos, splash e ícono de notificación (en `assets/`). **Son provisionales (letra "P")**: si tienen logo real, reemplacen `icon.png` (1024×1024 sin transparencia), `adaptive-icon.png` (1024×1024, logo dentro del 66 % central, fondo transparente), `splash.png` y `notification-icon.png` (96×96 blanco sobre transparente).
- ✅ Eliminar cuenta dentro de la app (Perfil → *Eliminar mi cuenta*) — exigido por Apple 5.1.1(v) y Google.
- ✅ Política de Privacidad y Términos dentro de la app (`constants/legal.ts`, ruta `/legal?type=privacy|terms`). **Son borrador: revisarlos con un abogado.**
- ✅ Permisos limpios (cámara, fotos, ubicación solo "al usar la app"); sin micrófono ni almacenamiento.
- ✅ `eas.json` listo (versionado automático, Android genera AAB, iOS genera IPA).
- ✅ CI en GitHub Actions (tipos, lint y build web).

---

## 1. Cuentas (👤) — empezar HOY, algunas tardan días/semanas

| Cuenta | Costo | Notas |
|---|---|---|
| **Apple Developer Program** | 99 USD/año | Como **organización** piden número **D-U-N-S** (gratis, tarda 1–2 semanas en llegar) y verificación de la empresa. Como individuo es inmediato pero la app sale a nombre de la persona. |
| **Google Play Console** | 25 USD único | Si la cuenta es de **organización** nueva: también D-U-N-S. Si es personal creada después de nov-2023: **prueba cerrada con 12+ testers durante 14 días seguidos** antes de poder publicar en producción. **Inicien esto primero.** |
| **Expo (EAS)** | Gratis (30 builds/mes) | https://expo.dev → crear cuenta/organización. |
| **Un dominio/URL pública** | — | Ya existe el despliegue web (Railway/Vercel). Las URLs de privacidad serán `https://TU-DOMINIO/legal?type=privacy` y `.../legal?type=terms`. Verifiquen que abren sin iniciar sesión. |

---

## 2. Preparar Supabase y secretos (👤)

1. Ejecutar migraciones (`supabase/migrations/…037_invoices.sql` incluida) en el proyecto de **producción**. Recomendado: probarlas antes en un proyecto de staging vacío.
2. Desplegar funciones:
   ```bash
   supabase functions deploy send-email delete-account
   supabase secrets set SENDGRID_API_KEY=SG.xxx FROM_EMAIL=noreply@tu-dominio.com
   ```
3. En SendGrid, verificar el dominio/remitente (si no, los correos caen en spam o se rechazan).
4. Crear en Supabase Auth → URL Configuration: *Site URL* = tu dominio web y agregar `provendor://` en *Redirect URLs* (para el reseteo de contraseña).

## 3. Primer build (👤 comandos, desde su computador)

```bash
npm install -g eas-cli
npm install --legacy-peer-deps
eas login
eas init                       # crea el projectId y lo escribe en app.json
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL      --value https://TU-PROYECTO.supabase.co
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value TU_ANON_KEY
# (Stripe se agrega al final: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
eas build -p android --profile preview     # APK/AAB de prueba, instalar en un teléfono real
eas build -p ios     --profile preview     # pide login de Apple; EAS crea certificados solo
```
Pruebe en teléfono real: registro de los 3 roles, login, publicar trabajo, ofertar, aceptar, firmar OT, completar con fotos, factura, notificaciones push, eliminar cuenta, reset de contraseña.

## 4. Apple App Store (👤)

1. https://appstoreconnect.apple.com → *Apps → +* → Nueva app. Bundle ID `com.provendor.app` (EAS lo registra en el primer build iOS).
2. Anotar el **App Store Connect App ID** (número) y **Team ID** y ponerlos en `eas.json → submit.production.ios` (`ascAppId`, `appleTeamId`, `appleId`).
3. Build y envío:
   ```bash
   eas build -p ios --profile production
   eas submit -p ios --profile production
   ```
4. Probar por **TestFlight** (equipo interno) antes de enviar a revisión.
5. Completar la ficha (textos en la sección 7), capturas, y:
   - **App Privacy** (etiquetas de nutrición): ver sección 8.
   - **URL de privacidad** y **URL de soporte** (obligatorias).
   - **Clasificación por edades**: 4+ (sin contenido sensible). Cuestionario honesto: sin contenido generado por usuarios público (chat solo con soporte).
   - **Información de revisión**: usuario y contraseña de demo de **cada rol** (cliente, proveedor, admin si aplica) y las notas de la sección 9.
6. *Enviar para revisión*. Tiempo típico: 24–48 h; si rechazan, responden en Resolution Center.

## 5. Google Play (👤)

1. https://play.google.com/console → *Crear app* (idioma por defecto: Español o Inglés; gratis; app, no juego).
2. **Service account para subir con EAS**: Play Console → *Configuración → Acceso a la API* → crear cuenta de servicio con permisos de *Release manager*, descargar el JSON y guardarlo como `play-service-account.json` en la raíz (**ya está en `.gitignore`, no lo suban**).
3. **La primera versión debe subirse a mano** (limitación de Google): 
   ```bash
   eas build -p android --profile production     # genera .aab
   ```
   Descargue el `.aab` desde expo.dev y súbalo en *Pruebas → Prueba interna / cerrada*. Las siguientes ya pueden ir con `eas submit -p android`.
4. Completar *Contenido de la app*: política de privacidad (URL), anuncios (No), acceso a la app (credenciales de demo), clasificación de contenido, público objetivo (18+), **Seguridad de los datos** (sección 8), declaración de **ubicación** (solo en primer plano) y **eliminación de cuenta** (URL: la de privacidad; indicar "Perfil → Eliminar mi cuenta").
5. Si aplica la regla de 12 testers: reclutarlos en *Pruebas cerradas*, mantener 14 días, luego *Solicitar acceso a producción*.

## 6. Capturas de pantalla (👤)

Tomarlas con la app real y datos de demo (no con datos de clientes reales).
- iPhone 6.7" (1290×2796) — mínimo 3, ideal 5–8. (iPad no: `supportsTablet: false`.)
- Android teléfono (mín. 2, 1080×1920 o similar) + **gráfico de funciones** 1024×500 (obligatorio en Play) + ícono 512×512.
- Sugerencia de pantallas: Bienvenida, Publicar trabajo, Ofertas recibidas, Orden de trabajo con firma, Factura, Perfil de proveedor.

## 7. Textos de la ficha (copiar y pegar)

**Nombre:** ProVendor  
**Subtítulo (iOS, ≤30):** Limpieza profesional a un toque / Professional cleaning, on demand  
**Categoría:** Negocios (alternativa: Estilo de vida) · **Precio:** gratis

**Descripción corta (Play, ≤80):**
- ES: Encuentra proveedores de limpieza verificados para tu hogar o negocio.
- EN: Find verified cleaning providers for your home or business.

**Descripción (ES):**
ProVendor conecta clientes con empresas y profesionales independientes de limpieza verificados en Estados Unidos y Colombia.

• Publica un trabajo residencial o comercial en minutos y recibe ofertas.
• Compara proveedores, calificaciones y documentos verificados.
• Acepta una oferta y firma la orden de trabajo digitalmente.
• Seguimiento del servicio con fotos de antes y después.
• Facturas claras al terminar cada trabajo.
• Chat con soporte, notificaciones y disputas si algo sale mal.
• Para proveedores: encuentra trabajos cerca de ti, envía ofertas y gestiona tus ganancias.

Disponible en español e inglés.

**Description (EN):**
ProVendor connects clients with verified cleaning companies and independent professionals in the USA and Colombia.

• Post a residential or commercial job in minutes and receive offers.
• Compare providers, ratings and verified documents.
• Accept an offer and digitally sign the work order.
• Track the service with before/after photos.
• Clear invoices after every job.
• Support chat, notifications and disputes if something goes wrong.
• For providers: find jobs near you, send offers and track your earnings.

Available in English and Spanish.

**Palabras clave (iOS, ≤100):** limpieza,cleaning,hogar,oficina,proveedores,servicios,facturas,trabajos,Colombia,USA  
**Notas de la versión 1.0:** Primera versión de ProVendor. / First release of ProVendor.

## 8. Cuestionarios de privacidad (👤 marcar en las consolas)

Datos que la app recopila (según el código): correo, nombre, teléfono, dirección física, fecha de nacimiento (independientes), documentos de verificación (fotos/archivos), ubicación (aprox./precisa, solo en primer plano), fotos de trabajos, mensajes de chat, firmas, calificaciones, token de notificaciones, ID de usuario.

**Apple – App Privacy:** Contact Info (nombre, email, teléfono, dirección) · Location (precise) · User Content (fotos, mensajes, otro contenido) · Identifiers (User ID, Device ID/push token) · Financial info: **No** (hasta activar Stripe; luego "Payment info" lo maneja Stripe). Todos: *vinculados al usuario*, uso = *funcionalidad de la app*; **Tracking: No**.

**Google – Data safety:** mismos datos; *recopilados*, *no vendidos*, *compartidos* solo con proveedores de servicio (Supabase, SendGrid) para operar la app; cifrado en tránsito: **Sí**; el usuario puede **solicitar eliminación**: **Sí** (en la app).

## 9. Notas para el revisor de Apple/Google (pegar tal cual, completar credenciales)

> ProVendor is a marketplace for physical cleaning services performed outside the app (Guideline 3.1.3(e)); no digital goods are sold, so no in-app purchases are used. Accounts require verification by our admin team, so please use the pre-approved demo accounts below.
> Client demo: `____@____` / `________`
> Provider demo: `____@____` / `________`
> Account deletion: Profile → "Delete my account". Privacy policy and Terms are linked on the welcome screen and in Profile.
> Location is used only while the app is open, to show nearby jobs (optional).

👤 **Antes de enviar:** crear en la base de producción esas cuentas demo **ya aprobadas**, con un trabajo de ejemplo en cada estado (abierto, en curso, completado con factura), para que el revisor pueda recorrer todo.

## 10. Después de publicar (👤)

- Responder reseñas; mantener `soporte` operativo (el correo de soporte debe existir y leerse).
- Para cada actualización: subir versión con `eas build --profile production --auto-submit` (el número de build sube solo).
- Cambios de JS pequeños sin pasar por revisión: agregar `expo-updates` (pendiente, opcional).
- Pendientes de producto antes/después: **Stripe**, **factura electrónica DIAN**, Sentry, pruebas automáticas.

## 11. Riesgos de rechazo conocidos

1. **Sin credenciales de demo** → rechazo casi seguro (4.0 / 2.1). Ver sección 9.
2. **Contenido generado por usuarios (Apple 1.2):** hoy el chat es entre usuarios y el equipo de soporte, y hay reseñas. Si en el futuro hay chat cliente↔proveedor, hay que agregar *reportar* y *bloquear usuario*.
3. **Política de privacidad inaccesible** o sin URL pública.
4. **Íconos/capturas provisionales** → reemplazar con la marca real.
5. **Cobros fuera de la app:** está permitido porque son servicios físicos; mantener la explicación en las notas del revisor.
