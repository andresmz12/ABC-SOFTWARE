export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export const CO_DEPARTMENTS = [
  { code: 'AMA', name: 'Amazonas' }, { code: 'ANT', name: 'Antioquia' }, { code: 'ARA', name: 'Arauca' },
  { code: 'ATL', name: 'Atlántico' }, { code: 'BOG', name: 'Bogotá D.C.' }, { code: 'BOL', name: 'Bolívar' },
  { code: 'BOY', name: 'Boyacá' }, { code: 'CAL', name: 'Caldas' }, { code: 'CAQ', name: 'Caquetá' },
  { code: 'CAS', name: 'Casanare' }, { code: 'CAU', name: 'Cauca' }, { code: 'CES', name: 'Cesar' },
  { code: 'CHO', name: 'Chocó' }, { code: 'COR', name: 'Córdoba' }, { code: 'CUN', name: 'Cundinamarca' },
  { code: 'GUA', name: 'Guainía' }, { code: 'GUV', name: 'Guaviare' }, { code: 'HUI', name: 'Huila' },
  { code: 'LAG', name: 'La Guajira' }, { code: 'MAG', name: 'Magdalena' }, { code: 'MET', name: 'Meta' },
  { code: 'NAR', name: 'Nariño' }, { code: 'NSA', name: 'Norte de Santander' }, { code: 'PUT', name: 'Putumayo' },
  { code: 'QUI', name: 'Quindío' }, { code: 'RIS', name: 'Risaralda' }, { code: 'SAP', name: 'San Andrés y Providencia' },
  { code: 'SAN', name: 'Santander' }, { code: 'SUC', name: 'Sucre' }, { code: 'TOL', name: 'Tolima' },
  { code: 'VAC', name: 'Valle del Cauca' }, { code: 'VAU', name: 'Vaupés' }, { code: 'VID', name: 'Vichada' },
];

export const CO_MUNICIPALITIES: Record<string, string[]> = {
  AMA: ['Leticia', 'Puerto Nariño'],
  ANT: ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Sabaneta', 'La Estrella', 'Copacabana', 'Rionegro', 'La Ceja', 'Caldas', 'Girardota', 'Barbosa'],
  ARA: ['Arauca', 'Saravena', 'Fortul', 'Tame'],
  ATL: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Baranoa', 'Santo Tomás'],
  BOG: ['Bogotá D.C.'],
  BOL: ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  BOY: ['Tunja', 'Sogamoso', 'Duitama', 'Chiquinquirá', 'Paipa', 'Monguí'],
  CAL: ['Manizales', 'Villamaría', 'La Dorada', 'Riosucio', 'Chinchiná', 'Salamina'],
  CAQ: ['Florencia', 'San Vicente del Caguán', 'Puerto Rico'],
  CAS: ['Yopal', 'Aguazul', 'Villanueva', 'Monterrey'],
  CAU: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía'],
  CES: ['Valledupar', 'Aguachica', 'Codazzi', 'Bosconia'],
  CHO: ['Quibdó', 'Istmina', 'Riosucio', 'Condoto'],
  COR: ['Montería', 'Cereté', 'Sahagún', 'Montelíbano', 'Lorica'],
  CUN: ['Soacha', 'Fusagasugá', 'Zipaquirá', 'Facatativá', 'Chía', 'Cajicá', 'Mosquera', 'Madrid', 'Funza', 'Girardot'],
  GUA: ['Inírida'],
  GUV: ['San José del Guaviare', 'El Retorno'],
  HUI: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre'],
  LAG: ['Riohacha', 'Maicao', 'Uribia', 'Manaure'],
  MAG: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'],
  MET: ['Villavicencio', 'Acacías', 'Granada', 'San Martín'],
  NAR: ['Pasto', 'Tumaco', 'Ipiales', 'La Unión', 'Túquerres'],
  NSA: ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios'],
  PUT: ['Mocoa', 'Puerto Asís', 'La Hormiga', 'Orito'],
  QUI: ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'Circasia'],
  RIS: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella'],
  SAP: ['San Andrés', 'Providencia'],
  SAN: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'],
  SUC: ['Sincelejo', 'Corozal', 'Sampués', 'Tolú'],
  TOL: ['Ibagué', 'Espinal', 'Honda', 'Melgar', 'Chaparral', 'Líbano'],
  VAC: ['Cali', 'Buenaventura', 'Buga', 'Palmira', 'Tuluá', 'Yumbo', 'Jamundí', 'Cartago', 'Buga'],
  VAU: ['Mitú'],
  VID: ['Puerto Carreño', 'La Primavera'],
};

export const US_CITIES_BY_STATE: Record<string, string[]> = {
  CA: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Oakland', 'Long Beach', 'Bakersfield', 'Anaheim'],
  TX: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock'],
  FL: ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale', 'Cape Coral', 'Pembroke Pines'],
  NY: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem'],
  IL: ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma'],
  GA: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Macon', 'Roswell'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary'],
  MI: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Flint'],
  NJ: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton', 'Camden', 'Clifton'],
  VA: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton'],
  WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kirkland', 'Renton'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Tempe', 'Gilbert'],
  CO: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Boulder', 'Westminster'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers'],
  MO: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', "Lee's Summit", "O'Fallon"],
  MD: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Hagerstown'],
  WI: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton'],
  MN: ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park'],
  SC: ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville'],
  AL: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Hoover'],
  KY: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Hopkinsville'],
  OR: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Bend'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton', 'Edmond'],
  NV: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City'],
  CT: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Norwalk'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy'],
  IA: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo'],
  MS: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian'],
  KS: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe', 'Lawrence'],
  AR: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Rogers'],
  NM: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'],
  NE: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'],
  ID: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Caldwell', 'Pocatello'],
  WV: ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling'],
  HI: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu'],
  NH: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester'],
  ME: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'],
  MT: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte'],
  RI: ['Providence', 'Cranston', 'Warwick', 'Pawtucket', 'East Providence'],
  DE: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka'],
  VT: ['Burlington', 'South Burlington', 'Rutland', 'Barre'],
  WY: ['Cheyenne', 'Casper', 'Laramie', 'Gillette'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Metairie', 'Lafayette', 'Lake Charles'],
  MA: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton'],
};

export const CO_VIA_TYPES = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Circular'];

export const US_BUSINESS_TYPES = ['LLC', 'Corporation', 'Sole Proprietor', 'Partnership', 'S-Corp', 'Non-Profit'];

export const CO_BUSINESS_TYPES = ['SAS', 'LTDA', 'S.A.', 'Persona Natural', 'E.A.T.', 'S.A.S. con Beneficio e Interés Colectivo'];

export const US_FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const CO_FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'Única vez' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

export function formatUSPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `+1 (${digits}`;
  if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatCOCelular(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `+57 ${digits}`;
  if (digits.length <= 6) return `+57 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function formatCOFijo(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 1) return `+57 ${digits}`;
  if (digits.length <= 4) return `+57 (${digits.slice(0, 1)}) ${digits.slice(1)}`;
  return `+57 (${digits.slice(0, 1)}) ${digits.slice(1, 4)} ${digits.slice(4)}`;
}

export function formatEIN(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatNIT(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')} COP`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildCOAddressPreview(
  viaType: string,
  numeroPrincipal: string,
  numeroSecundario: string,
  complemento: string,
  barrio: string,
  ciudad: string,
  departamento: string,
): string {
  const parts: string[] = [];
  if (viaType && numeroPrincipal) {
    parts.push(`${viaType} ${numeroPrincipal}${numeroSecundario ? ` # ${numeroSecundario}` : ''}`);
  }
  if (complemento) parts.push(complemento);
  if (barrio) parts.push(`Barrio ${barrio}`);
  if (ciudad) parts.push(ciudad);
  if (departamento) parts.push(departamento);
  return parts.join(', ');
}
