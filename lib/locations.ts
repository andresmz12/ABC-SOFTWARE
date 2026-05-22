export const USA_LOCATIONS: Record<string, string[]> = {
  Illinois: ['Chicago','Aurora','Rockford','Joliet','Naperville','Springfield','Peoria','Elgin','Waukegan','Cicero','Champaign','Bloomington'],
  Ohio: ['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton','Parma','Canton','Youngstown','Lorain','Hamilton','Springfield'],
  Michigan: ['Detroit','Grand Rapids','Warren','Sterling Heights','Ann Arbor','Lansing','Flint','Dearborn','Livonia','Troy','Westland','Kalamazoo'],
  Indiana: ['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel','Fishers','Bloomington','Hammond','Gary','Muncie','Lafayette'],
  Wisconsin: ['Milwaukee','Madison','Green Bay','Kenosha','Racine','Appleton','Waukesha','Oshkosh','Eau Claire','Janesville','West Allis'],
  Minnesota: ['Minneapolis','Saint Paul','Rochester','Duluth','Bloomington','Brooklyn Park','Plymouth','Maple Grove','Woodbury','St Cloud'],
  Iowa: ['Des Moines','Cedar Rapids','Davenport','Sioux City','Iowa City','Waterloo','Council Bluffs','Ames','West Des Moines','Dubuque'],
  Missouri: ['Kansas City','Saint Louis','Springfield','Columbia','Independence',"Lee's Summit","O'Fallon",'St Joseph','St Charles','Blue Springs'],
  Kansas: ['Wichita','Overland Park','Kansas City','Olathe','Topeka','Lawrence','Shawnee','Manhattan','Lenexa','Salina'],
  Nebraska: ['Omaha','Lincoln','Bellevue','Grand Island','Kearney','Fremont','Hastings','Norfolk','Columbus','North Platte'],
  'South Dakota': ['Sioux Falls','Rapid City','Aberdeen','Brookings','Watertown','Mitchell','Yankton','Pierre','Huron','Vermillion'],
  'North Dakota': ['Fargo','Bismarck','Grand Forks','Minot','West Fargo','Williston','Dickinson','Mandan','Jamestown','Wahpeton'],
};

export const COLOMBIA_LOCATIONS: Record<string, string[]> = {
  Antioquia: [
    'Medellín','Bello','Itagüí','Envigado','Apartadó','Turbo','Rionegro','Caucasia','Sabaneta',
    'La Estrella','Copacabana','Girardota','Barbosa','Caldas','El Retiro','Marinilla',
    'El Carmen de Viboral','Guarne','San Pedro','Andes','Ciudad Bolívar','Jardín','Jericó','Támesis',
  ],
};

export const getLocations = (country: 'usa' | 'colombia'): Record<string, string[]> =>
  country === 'colombia' ? COLOMBIA_LOCATIONS : USA_LOCATIONS;
