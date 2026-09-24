CREATE TABLE public.countries (
  code text PRIMARY KEY CHECK(code ~ '^[A-Z]{2}$'),
  name text NOT NULL
);

CREATE TABLE public.country_states (
  country_code text NOT NULL REFERENCES public.countries(code),
  code text NOT NULL CHECK (code ~ '^[A-Z]{2,3}$'),
  name text NOT NULL,
  PRIMARY KEY (country_code, code)
);

INSERT INTO public.countries(code, name)
VALUES ('MX', 'México');

-- ISO 3166-2:MX (32 entidades federativas)
INSERT INTO public.country_states (country_code, code, name)
VALUES
  ('MX', 'AGU', 'Aguascalientes'),
  ('MX', 'BCN', 'Baja California'),
  ('MX', 'BCS', 'Baja California Sur'),
  ('MX', 'CAM', 'Campeche'),
  ('MX', 'CHP', 'Chiapas'),
  ('MX', 'CHH', 'Chihuahua'),
  ('MX', 'CMX', 'Ciudad de México'),
  ('MX', 'COA', 'Coahuila'),
  ('MX', 'COL', 'Colima'),
  ('MX', 'DUR', 'Durango'),
  ('MX', 'GUA', 'Guanajuato'),
  ('MX', 'GRO', 'Guerrero'),
  ('MX', 'HID', 'Hidalgo'),
  ('MX', 'JAL', 'Jalisco'),
  ('MX', 'MEX', 'Estado de México'),
  ('MX', 'MIC', 'Michoacán'),
  ('MX', 'MOR', 'Morelos'),
  ('MX', 'NAY', 'Nayarit'),
  ('MX', 'NLE', 'Nuevo León'),
  ('MX', 'OAX', 'Oaxaca'),
  ('MX', 'PUE', 'Puebla'),
  ('MX', 'QUE', 'Querétaro'),
  ('MX', 'ROO', 'Quintana Roo'),
  ('MX', 'SLP', 'San Luis Potosí'),
  ('MX', 'SIN', 'Sinaloa'),
  ('MX', 'SON', 'Sonora'),
  ('MX', 'TAB', 'Tabasco'),
  ('MX', 'TAM', 'Tamaulipas'),
  ('MX', 'TLA', 'Tlaxcala'),
  ('MX', 'VER', 'Veracruz'),
  ('MX', 'YUC', 'Yucatán'),
  ('MX', 'ZAC', 'Zacatecas');

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_read_all" ON public.countries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "country_states_read_all" ON public.country_states
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.countries, public.country_states TO anon, authenticated;
GRANT ALL ON public.countries, public.country_states  To service_role;