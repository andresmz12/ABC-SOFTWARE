// Legal texts shown in-app (app/(shared)/legal.tsx).
// DRAFT: have a lawyer review before publishing, and replace the placeholders
// (company legal name, contact email, governing law) marked with [brackets].
// The same URLs must be entered in App Store Connect / Google Play Console.

export const LEGAL_CONTACT = 'info@ismconsultores.com';

type Doc = { title: string; sections: { h: string; p: string }[] };

export const LEGAL_DOCS: { updated: string; privacy: { en: Doc; es: Doc }; terms: { en: Doc; es: Doc } } = {
  updated: '2026-11-23',
  privacy: {
    en: {
      title: 'Privacy Policy',
      sections: [
        { h: '1. Who we are', p: `ProVendor ("we") is a marketplace that connects clients with cleaning service providers in the USA and Colombia. Contact: ${LEGAL_CONTACT}.` },
        { h: '2. Data we collect', p: 'Account data (name, email, phone, address, date of birth for independents, company data and EIN/NIT for companies); documents you upload for verification; job requests, bids, messages, ratings, work orders with signatures and invoices; photos you attach to jobs; approximate/precise location when you allow it; device push token for notifications.' },
        { h: '3. How we use it', p: 'To create and secure your account, verify providers, match clients and providers, run jobs and work orders, issue invoices, send notifications and emails, resolve disputes, prevent fraud and comply with the law.' },
        { h: '4. Who sees it', p: 'Clients and providers see the information needed to complete a job (name, city, job details, messages). Our administrators review documents and disputes. We use service providers to operate the app (Supabase for database and storage, SendGrid for email, and payment processors if enabled). We do not sell your personal data.' },
        { h: '5. Location', p: 'Location is used only to match you with nearby jobs, and only if you grant permission. You can revoke it at any time in your device settings.' },
        { h: '6. Retention and deletion', p: 'You can delete your account in Profile → Delete my account. Your personal data is deleted or anonymised. Records we must keep for accounting or dispute purposes (jobs, invoices) are kept without personal identifiers where possible.' },
        { h: '7. Your rights', p: `Depending on where you live (including California and Colombia's Law 1581 of 2012) you may access, correct, delete or object to the processing of your data. Write to ${LEGAL_CONTACT}.` },
        { h: '8. Security', p: 'Data is encrypted in transit and protected with access rules per user role. No system is 100% secure.' },
        { h: '9. Children', p: 'The service is not intended for people under 18.' },
        { h: '10. Changes', p: 'We will notify you in the app of material changes to this policy.' },
      ],
    },
    es: {
      title: 'Política de Privacidad',
      sections: [
        { h: '1. Quiénes somos', p: `ProVendor ("nosotros") es un marketplace que conecta clientes con proveedores de servicios de limpieza en Estados Unidos y Colombia. Contacto: ${LEGAL_CONTACT}.` },
        { h: '2. Datos que recopilamos', p: 'Datos de cuenta (nombre, correo, teléfono, dirección, fecha de nacimiento de independientes, datos de empresa y EIN/NIT); documentos que subes para verificación; solicitudes de trabajo, ofertas, mensajes, calificaciones, órdenes de trabajo con firmas y facturas; fotos que adjuntas a los trabajos; ubicación aproximada o precisa si la autorizas; token del dispositivo para notificaciones.' },
        { h: '3. Para qué los usamos', p: 'Para crear y proteger tu cuenta, verificar proveedores, conectar clientes y proveedores, ejecutar trabajos y órdenes de trabajo, emitir facturas, enviar notificaciones y correos, resolver disputas, prevenir fraude y cumplir la ley.' },
        { h: '4. Quién los ve', p: 'Clientes y proveedores ven la información necesaria para completar un trabajo (nombre, ciudad, detalles, mensajes). Nuestros administradores revisan documentos y disputas. Usamos proveedores para operar la app (Supabase para base de datos y almacenamiento, SendGrid para correo y procesadores de pago si se habilitan). No vendemos tus datos personales.' },
        { h: '5. Ubicación', p: 'La ubicación se usa solo para mostrarte trabajos cercanos y únicamente si das permiso. Puedes revocarlo en cualquier momento desde los ajustes de tu dispositivo.' },
        { h: '6. Conservación y eliminación', p: 'Puedes eliminar tu cuenta en Perfil → Eliminar mi cuenta. Tus datos personales se eliminan o se anonimizan. Los registros que debemos conservar por contabilidad o disputas (trabajos, facturas) se mantienen sin identificadores personales cuando es posible.' },
        { h: '7. Tus derechos', p: `Según tu lugar de residencia (incluida California y la Ley 1581 de 2012 de Colombia) puedes conocer, actualizar, rectificar, suprimir tus datos o oponerte a su tratamiento. Escribe a ${LEGAL_CONTACT}.` },
        { h: '8. Seguridad', p: 'Los datos se cifran en tránsito y se protegen con reglas de acceso por rol. Ningún sistema es 100% seguro.' },
        { h: '9. Menores', p: 'El servicio no está dirigido a menores de 18 años.' },
        { h: '10. Cambios', p: 'Te avisaremos en la app de cambios importantes a esta política.' },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Use',
      sections: [
        { h: '1. The service', p: 'ProVendor is a marketplace. Providers are independent businesses or contractors, not employees of ProVendor. We help clients and providers find each other, sign work orders and issue invoices.' },
        { h: '2. Accounts', p: 'You must be 18+, provide accurate information and keep your credentials safe. Providers must upload valid documents and may be approved, rejected or suspended after review.' },
        { h: '3. Jobs, work orders and invoices', p: 'Accepting a bid creates a work order that both parties sign. Providers issue invoices after completing a job; invoices are reviewed and approved by ProVendor before being sent to the client.' },
        { h: '4. Payments', p: 'Unless stated otherwise in the app, payment terms are those on the invoice. Online payment processing may be added in the future and will have its own terms.' },
        { h: '5. Conduct', p: 'No fraud, harassment, off-platform circumvention of fees where applicable, false documents or unlawful use. We may suspend accounts that violate these terms.' },
        { h: '6. Disputes', p: 'Either party can open a dispute in the app. ProVendor may help mediate but is not liable for the work performed by providers.' },
        { h: '7. Liability', p: 'To the maximum extent allowed by law, the service is provided "as is" and ProVendor is not liable for indirect damages. Nothing here limits liability that cannot be limited by law.' },
        { h: '8. Account deletion', p: 'You may delete your account at any time from your profile.' },
        { h: '9. Governing law', p: '[Governing law and jurisdiction — to be completed with legal counsel.]' },
        { h: '10. Contact', p: LEGAL_CONTACT },
      ],
    },
    es: {
      title: 'Términos de Uso',
      sections: [
        { h: '1. El servicio', p: 'ProVendor es un marketplace. Los proveedores son empresas o contratistas independientes, no empleados de ProVendor. Ayudamos a que clientes y proveedores se encuentren, firmen órdenes de trabajo y emitan facturas.' },
        { h: '2. Cuentas', p: 'Debes ser mayor de 18 años, dar información veraz y proteger tus credenciales. Los proveedores deben subir documentos válidos y pueden ser aprobados, rechazados o suspendidos tras la revisión.' },
        { h: '3. Trabajos, órdenes de trabajo y facturas', p: 'Aceptar una oferta crea una orden de trabajo que ambas partes firman. Los proveedores emiten la factura al completar el trabajo; ProVendor la revisa y aprueba antes de enviarla al cliente.' },
        { h: '4. Pagos', p: 'Salvo que la app indique otra cosa, las condiciones de pago son las de la factura. El pago en línea podrá agregarse en el futuro con sus propios términos.' },
        { h: '5. Conducta', p: 'Prohibido el fraude, el acoso, los documentos falsos o el uso ilegal. Podemos suspender cuentas que incumplan estos términos.' },
        { h: '6. Disputas', p: 'Cualquiera de las partes puede abrir una disputa en la app. ProVendor puede mediar pero no responde por el trabajo realizado por los proveedores.' },
        { h: '7. Responsabilidad', p: 'En la máxima medida permitida por la ley, el servicio se ofrece "tal cual" y ProVendor no responde por daños indirectos. Nada de lo anterior limita responsabilidades que la ley no permita limitar.' },
        { h: '8. Eliminación de cuenta', p: 'Puedes eliminar tu cuenta en cualquier momento desde tu perfil.' },
        { h: '9. Ley aplicable', p: '[Ley y jurisdicción aplicables — completar con asesoría legal.]' },
        { h: '10. Contacto', p: LEGAL_CONTACT },
      ],
    },
  },
};
