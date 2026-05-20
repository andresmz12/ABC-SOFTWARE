export interface DocRequirement {
  key: string;
  label: string;
  info?: string;
}

export const USA_COMPANY_DOCS: DocRequirement[] = [
  { key: 'w9', label: 'W-9 Form (PDF)', info: 'Download blank W-9 from IRS.gov' },
  { key: 'insurance', label: 'Certificate of Insurance — General Liability min $1M (PDF)', info: 'Must show coverage dates and policy number' },
  { key: 'business_license', label: 'Business License (PDF or image)', info: 'State or local business license' },
  { key: 'ein_letter', label: 'EIN Confirmation Letter (PDF)', info: 'CP-575 letter from IRS' },
  { key: 'service_agreement', label: 'Signed Service Agreement (PDF)', info: 'Download template, sign, and upload' },
];

export const USA_INDEPENDENT_DOCS: DocRequirement[] = [
  { key: 'w9', label: 'W-9 Form (PDF)', info: 'Download blank W-9 from IRS.gov' },
  { key: 'gov_id_front', label: 'Government-issued ID — Front (image)', info: "Driver's license, passport, or state ID" },
  { key: 'gov_id_back', label: 'Government-issued ID — Back (image)', info: '' },
  { key: 'background_check', label: 'Background Check Consent Form (PDF)', info: 'Download, sign, and upload' },
  { key: 'contractor_agreement', label: 'Signed Independent Contractor Agreement (PDF)', info: 'Download template, sign, and upload' },
];

export const CO_COMPANY_DOCS: DocRequirement[] = [
  { key: 'rut', label: 'RUT — Registro Único Tributario (PDF)', info: 'Expedido por la DIAN, debe estar vigente' },
  { key: 'camara_comercio', label: 'Cámara de Comercio (PDF)', info: 'Vigencia no mayor a 90 días' },
  { key: 'cedula_rep_front', label: 'Cédula Representante Legal — Frente (imagen)', info: '' },
  { key: 'cedula_rep_back', label: 'Cédula Representante Legal — Reverso (imagen)', info: '' },
  { key: 'cert_existencia', label: 'Certificado de Existencia y Representación Legal (PDF)', info: 'Expedido por Cámara de Comercio' },
  { key: 'poliza_rc', label: 'Póliza de Responsabilidad Civil Extracontractual (PDF)', info: 'Mínimo 50 SMMLV de cobertura' },
  { key: 'contrato_servicios', label: 'Contrato de Prestación de Servicios firmado (PDF)', info: 'Descarga la plantilla, firma y sube' },
];

export const CO_INDEPENDENT_DOCS: DocRequirement[] = [
  { key: 'cedula_front', label: 'Cédula de Ciudadanía — Frente (imagen)', info: '' },
  { key: 'cedula_back', label: 'Cédula de Ciudadanía — Reverso (imagen)', info: '' },
  { key: 'rut_personal', label: 'RUT personal (PDF)', info: 'Expedido por la DIAN' },
  { key: 'antecedentes_judiciales', label: 'Certificado de Antecedentes Judiciales (PDF)', info: 'Expedido por la Policía Nacional, descarga en policia.gov.co' },
  { key: 'antecedentes_disciplinarios', label: 'Certificado de Antecedentes Disciplinarios (PDF)', info: 'Expedido por la Procuraduría General, descarga en procuraduria.gov.co' },
  { key: 'antecedentes_fiscales', label: 'Certificado de Antecedentes Fiscales (PDF)', info: 'Expedido por la Contraloría General' },
  { key: 'contrato_prestacion', label: 'Contrato de Prestación de Servicios firmado (PDF)', info: 'Descarga la plantilla, firma y sube' },
];

export function getCompanyDocs(country: 'usa' | 'colombia') {
  return country === 'colombia' ? CO_COMPANY_DOCS : USA_COMPANY_DOCS;
}

export function getIndependentDocs(country: 'usa' | 'colombia') {
  return country === 'colombia' ? CO_INDEPENDENT_DOCS : USA_INDEPENDENT_DOCS;
}
