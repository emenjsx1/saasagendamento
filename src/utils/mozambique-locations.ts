// Lista de províncias e principais cidades de Moçambique

export interface Province {
  name: string;
  cities: string[];
}

export const mozambiqueProvinces: Province[] = [
  {
    name: 'Maputo (Cidade)',
    cities: [
      'Maputo',
      'KaMpfumo',
      'Nlhamankulu',
      'KaMaxakeni',
      'KaMavota',
      'KaTembe',
      'KaNyaka'
    ]
  },
  {
    name: 'Maputo (Província)',
    cities: [
      'Matola',
      'Boane',
      'Namaacha',
      'Manhiça',
      'Marracuene',
      'Moamba'
    ]
  },
  {
    name: 'Gaza',
    cities: [
      'Xai-Xai',
      'Chókwè',
      'Chibuto',
      'Massingir',
      'Bilene',
      'Macia'
    ]
  },
  {
    name: 'Inhambane',
    cities: [
      'Inhambane',
      'Maxixe',
      'Vilanculos',
      'Panda',
      'Govuro',
      'Massinga'
    ]
  },
  {
    name: 'Sofala',
    cities: [
      'Beira',
      'Dondo',
      'Nhamatanda',
      'Muanza',
      'Gorongosa',
      'Caia'
    ]
  },
  {
    name: 'Manica',
    cities: [
      'Chimoio',
      'Manica',
      'Gondola',
      'Sussundenga',
      'Macate',
      'Vanduzi'
    ]
  },
  {
    name: 'Tete',
    cities: [
      'Tete',
      'Moatize',
      'Angónia',
      'Zumbo',
      'Cahora Bassa',
      'Changara'
    ]
  },
  {
    name: 'Zambézia',
    cities: [
      'Quelimane',
      'Mocuba',
      'Gurúè',
      'Milange',
      'Alto Molócuè',
      'Nicoadala'
    ]
  },
  {
    name: 'Nampula',
    cities: [
      'Nampula',
      'Nacala',
      'Angoche',
      'Mozambique',
      'Monapo',
      'Ribáuè'
    ]
  },
  {
    name: 'Cabo Delgado',
    cities: [
      'Pemba',
      'Mocímboa da Praia',
      'Montepuez',
      'Mueda',
      'Palma',
      'Mocímboa'
    ]
  },
  {
    name: 'Niassa',
    cities: [
      'Lichinga',
      'Cuamba',
      'Metangula',
      'Mandimba',
      'Sanga',
      'Marrupa'
    ]
  }
];

export const businessCategories = [
  'Salão',
  'Clínica',
  'Barbearia',
  'Estúdio',
  'Consultório',
  'Veterinário',
  'Fisioterapia',
  'Psicologia',
  'Nutrição'
] as const;

export type BusinessCategory = typeof businessCategories[number];

// Função auxiliar para obter cidades de uma província
export function getCitiesByProvince(provinceName: string): string[] {
  const province = mozambiqueProvinces.find(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  return province?.cities || [];
}

// Função auxiliar para obter todas as províncias como array de strings
export function getAllProvinces(): string[] {
  return mozambiqueProvinces.map(p => p.name);
}

