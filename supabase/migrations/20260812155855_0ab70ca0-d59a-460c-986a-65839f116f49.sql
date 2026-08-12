
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','reception','comptable');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet text NOT NULL DEFAULT '',
  telephone text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nom_complet', NEW.email));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reception');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- ETABLISSEMENTS
CREATE TABLE public.etablissements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  ville text,
  pays text NOT NULL DEFAULT 'Gabon',
  telephone text,
  email text,
  devise text NOT NULL DEFAULT 'XAF',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etablissements TO authenticated;
GRANT ALL ON public.etablissements TO service_role;
ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etab_select" ON public.etablissements FOR SELECT TO authenticated USING (true);
CREATE POLICY "etab_admin_write" ON public.etablissements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_etab_updated BEFORE UPDATE ON public.etablissements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PARAMETRES
CREATE TABLE public.parametres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  cle text NOT NULL,
  valeur text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etablissement_id, cle)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametres TO authenticated;
GRANT ALL ON public.parametres TO service_role;
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "param_select" ON public.parametres FOR SELECT TO authenticated USING (true);
CREATE POLICY "param_admin_write" ON public.parametres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_param_updated BEFORE UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAMBRES
CREATE TABLE public.chambres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text NOT NULL,
  prix_nuit numeric(12,2) NOT NULL DEFAULT 0,
  capacite integer NOT NULL DEFAULT 2,
  statut text NOT NULL DEFAULT 'libre',
  description text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etablissement_id, nom)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chambres TO authenticated;
GRANT ALL ON public.chambres TO service_role;
ALTER TABLE public.chambres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chambres_select" ON public.chambres FOR SELECT TO authenticated USING (true);
CREATE POLICY "chambres_write" ON public.chambres FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "chambres_update" ON public.chambres FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chambres_delete" ON public.chambres FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_chambres_updated BEFORE UPDATE ON public.chambres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text,
  telephone text,
  email text,
  type_piece text,
  numero_piece text,
  nationalite text,
  adresse text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RESERVATIONS
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  chambre_id uuid NOT NULL REFERENCES public.chambres(id) ON DELETE RESTRICT,
  date_arrivee date NOT NULL,
  date_depart date NOT NULL,
  nb_personnes integer NOT NULL DEFAULT 1,
  prix_nuit numeric(12,2) NOT NULL,
  taxe_nuit numeric(12,2) NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'reservee',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resa_select" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "resa_insert" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "resa_update" ON public.reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "resa_delete" ON public.reservations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_resa_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_reservation_dates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.date_depart <= NEW.date_arrivee THEN
    RAISE EXCEPTION 'La date de départ doit être postérieure à la date d''arrivée';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.chambre_id = NEW.chambre_id
      AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND r.statut NOT IN ('annulee','terminee')
      AND NEW.date_arrivee < r.date_depart
      AND NEW.date_depart > r.date_arrivee
  ) THEN
    RAISE EXCEPTION 'Cette chambre est déjà réservée sur cette période';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_resa_dates BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.check_reservation_dates();

-- FACTURES
CREATE TABLE public.factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  numero text NOT NULL UNIQUE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  date_facture date NOT NULL DEFAULT CURRENT_DATE,
  montant_hebergement numeric(12,2) NOT NULL DEFAULT 0,
  montant_taxe numeric(12,2) NOT NULL DEFAULT 0,
  montant_autres numeric(12,2) NOT NULL DEFAULT 0,
  montant_total numeric(12,2) NOT NULL DEFAULT 0,
  montant_paye numeric(12,2) NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'impayee',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factures TO authenticated;
GRANT ALL ON public.factures TO service_role;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_select" ON public.factures FOR SELECT TO authenticated USING (true);
CREATE POLICY "fact_insert" ON public.factures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fact_update" ON public.factures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fact_delete" ON public.factures FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_fact_updated BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.facture_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  quantite numeric(12,2) NOT NULL DEFAULT 1,
  prix_unitaire numeric(12,2) NOT NULL DEFAULT 0,
  montant numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facture_lignes TO authenticated;
GRANT ALL ON public.facture_lignes TO service_role;
ALTER TABLE public.facture_lignes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fl_select" ON public.facture_lignes FOR SELECT TO authenticated USING (true);
CREATE POLICY "fl_insert" ON public.facture_lignes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fl_update" ON public.facture_lignes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fl_delete" ON public.facture_lignes FOR DELETE TO authenticated USING (true);

-- CAISSE
CREATE TABLE public.caisse_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  date_ouverture timestamptz NOT NULL DEFAULT now(),
  date_fermeture timestamptz,
  fond_initial numeric(12,2) NOT NULL DEFAULT 0,
  solde_final numeric(12,2),
  statut text NOT NULL DEFAULT 'ouverte',
  ouverte_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caisse_sessions TO authenticated;
GRANT ALL ON public.caisse_sessions TO service_role;
ALTER TABLE public.caisse_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_select" ON public.caisse_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_insert" ON public.caisse_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cs_update" ON public.caisse_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cs_delete" ON public.caisse_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.caisse_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.caisse_sessions(id) ON DELETE SET NULL,
  date_operation timestamptz NOT NULL DEFAULT now(),
  sens text NOT NULL DEFAULT 'entree',
  motif text NOT NULL,
  montant numeric(12,2) NOT NULL,
  mode_paiement text NOT NULL DEFAULT 'especes',
  facture_id uuid REFERENCES public.factures(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caisse_operations TO authenticated;
GRANT ALL ON public.caisse_operations TO service_role;
ALTER TABLE public.caisse_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_select" ON public.caisse_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "co_insert" ON public.caisse_operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "co_update" ON public.caisse_operations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "co_delete" ON public.caisse_operations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- PIECES DE CAISSE (PCS)
CREATE TABLE public.pieces_caisse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  numero text NOT NULL UNIQUE,
  type_piece text NOT NULL DEFAULT 'sortie',
  date_piece date NOT NULL DEFAULT CURRENT_DATE,
  beneficiaire text NOT NULL,
  motif text NOT NULL,
  montant numeric(12,2) NOT NULL,
  operation_id uuid REFERENCES public.caisse_operations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pieces_caisse TO authenticated;
GRANT ALL ON public.pieces_caisse TO service_role;
ALTER TABLE public.pieces_caisse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcs_select" ON public.pieces_caisse FOR SELECT TO authenticated USING (true);
CREATE POLICY "pcs_insert" ON public.pieces_caisse FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pcs_update" ON public.pieces_caisse FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pcs_delete" ON public.pieces_caisse FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- DEPENSES
CREATE TABLE public.depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  date_depense date NOT NULL DEFAULT CURRENT_DATE,
  categorie text NOT NULL,
  libelle text NOT NULL,
  montant numeric(12,2) NOT NULL,
  mode_paiement text NOT NULL DEFAULT 'especes',
  fournisseur text,
  piece_id uuid REFERENCES public.pieces_caisse(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depenses TO authenticated;
GRANT ALL ON public.depenses TO service_role;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dep_select" ON public.depenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "dep_insert" ON public.depenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dep_update" ON public.depenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dep_delete" ON public.depenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- TAXE DE SEJOUR
CREATE TABLE public.taxes_sejour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  date_nuitee date NOT NULL,
  nb_nuits integer NOT NULL DEFAULT 1,
  montant_unitaire numeric(12,2) NOT NULL,
  montant_total numeric(12,2) NOT NULL,
  reverse boolean NOT NULL DEFAULT false,
  date_reversement date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxes_sejour TO authenticated;
GRANT ALL ON public.taxes_sejour TO service_role;
ALTER TABLE public.taxes_sejour ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_select" ON public.taxes_sejour FOR SELECT TO authenticated USING (true);
CREATE POLICY "tx_insert" ON public.taxes_sejour FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tx_update" ON public.taxes_sejour FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tx_delete" ON public.taxes_sejour FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- DONNEES DE CONFIGURATION REELLES
INSERT INTO public.etablissements (id, nom, ville, pays, devise)
VALUES ('11111111-1111-1111-1111-111111111111','LE DAYA Guest House','Port-Gentil','Gabon','XAF');

INSERT INTO public.chambres (etablissement_id, nom, type, prix_nuit, capacite) VALUES
('11111111-1111-1111-1111-111111111111','Standard 1','Standard',25000,2),
('11111111-1111-1111-1111-111111111111','Standard 2','Standard',25000,2),
('11111111-1111-1111-1111-111111111111','Standard 3','Standard',25000,2),
('11111111-1111-1111-1111-111111111111','VIP','VIP',35000,2),
('11111111-1111-1111-1111-111111111111','Studio','Studio',50000,3);

INSERT INTO public.parametres (etablissement_id, cle, valeur, description) VALUES
('11111111-1111-1111-1111-111111111111','taxe_sejour_montant','1000','Taxe de séjour en FCFA par nuitée et par chambre'),
('11111111-1111-1111-1111-111111111111','prefixe_facture','FAC','Préfixe des numéros de facture'),
('11111111-1111-1111-1111-111111111111','prefixe_pcs','PCS','Préfixe des numéros de pièce de caisse');
