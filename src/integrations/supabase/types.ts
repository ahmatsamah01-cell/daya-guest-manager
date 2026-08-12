export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      caisse_operations: {
        Row: {
          created_at: string
          created_by: string | null
          date_operation: string
          etablissement_id: string
          facture_id: string | null
          id: string
          mode_paiement: string
          montant: number
          motif: string
          reservation_id: string | null
          sens: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_operation?: string
          etablissement_id: string
          facture_id?: string | null
          id?: string
          mode_paiement?: string
          montant: number
          motif: string
          reservation_id?: string | null
          sens?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_operation?: string
          etablissement_id?: string
          facture_id?: string | null
          id?: string
          mode_paiement?: string
          montant?: number
          motif?: string
          reservation_id?: string | null
          sens?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caisse_operations_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caisse_operations_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caisse_operations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caisse_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "caisse_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      caisse_sessions: {
        Row: {
          created_at: string
          date_fermeture: string | null
          date_ouverture: string
          etablissement_id: string
          fond_initial: number
          id: string
          ouverte_par: string | null
          solde_final: number | null
          statut: string
        }
        Insert: {
          created_at?: string
          date_fermeture?: string | null
          date_ouverture?: string
          etablissement_id: string
          fond_initial?: number
          id?: string
          ouverte_par?: string | null
          solde_final?: number | null
          statut?: string
        }
        Update: {
          created_at?: string
          date_fermeture?: string | null
          date_ouverture?: string
          etablissement_id?: string
          fond_initial?: number
          id?: string
          ouverte_par?: string | null
          solde_final?: number | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "caisse_sessions_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      chambres: {
        Row: {
          actif: boolean
          capacite: number
          created_at: string
          description: string | null
          etablissement_id: string
          id: string
          nom: string
          prix_nuit: number
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          capacite?: number
          created_at?: string
          description?: string | null
          etablissement_id: string
          id?: string
          nom: string
          prix_nuit?: number
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          capacite?: number
          created_at?: string
          description?: string | null
          etablissement_id?: string
          id?: string
          nom?: string
          prix_nuit?: number
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chambres_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          etablissement_id: string
          id: string
          nationalite: string | null
          nom: string
          notes: string | null
          numero_piece: string | null
          prenom: string | null
          telephone: string | null
          type_piece: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          etablissement_id: string
          id?: string
          nationalite?: string | null
          nom: string
          notes?: string | null
          numero_piece?: string | null
          prenom?: string | null
          telephone?: string | null
          type_piece?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          etablissement_id?: string
          id?: string
          nationalite?: string | null
          nom?: string
          notes?: string | null
          numero_piece?: string | null
          prenom?: string | null
          telephone?: string | null
          type_piece?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      depenses: {
        Row: {
          categorie: string
          created_at: string
          created_by: string | null
          date_depense: string
          etablissement_id: string
          fournisseur: string | null
          id: string
          libelle: string
          mode_paiement: string
          montant: number
          piece_id: string | null
        }
        Insert: {
          categorie: string
          created_at?: string
          created_by?: string | null
          date_depense?: string
          etablissement_id: string
          fournisseur?: string | null
          id?: string
          libelle: string
          mode_paiement?: string
          montant: number
          piece_id?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_depense?: string
          etablissement_id?: string
          fournisseur?: string | null
          id?: string
          libelle?: string
          mode_paiement?: string
          montant?: number
          piece_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depenses_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces_caisse"
            referencedColumns: ["id"]
          },
        ]
      }
      etablissements: {
        Row: {
          actif: boolean
          created_at: string
          devise: string
          email: string | null
          id: string
          nom: string
          pays: string
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          created_at?: string
          devise?: string
          email?: string | null
          id?: string
          nom: string
          pays?: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          created_at?: string
          devise?: string
          email?: string | null
          id?: string
          nom?: string
          pays?: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      facture_lignes: {
        Row: {
          created_at: string
          facture_id: string
          id: string
          libelle: string
          montant: number
          prix_unitaire: number
          quantite: number
        }
        Insert: {
          created_at?: string
          facture_id: string
          id?: string
          libelle: string
          montant?: number
          prix_unitaire?: number
          quantite?: number
        }
        Update: {
          created_at?: string
          facture_id?: string
          id?: string
          libelle?: string
          montant?: number
          prix_unitaire?: number
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "facture_lignes_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          date_facture: string
          etablissement_id: string
          id: string
          montant_autres: number
          montant_hebergement: number
          montant_paye: number
          montant_taxe: number
          montant_total: number
          numero: string
          reservation_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date_facture?: string
          etablissement_id: string
          id?: string
          montant_autres?: number
          montant_hebergement?: number
          montant_paye?: number
          montant_taxe?: number
          montant_total?: number
          numero: string
          reservation_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date_facture?: string
          etablissement_id?: string
          id?: string
          montant_autres?: number
          montant_hebergement?: number
          montant_paye?: number
          montant_taxe?: number
          montant_total?: number
          numero?: string
          reservation_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres: {
        Row: {
          cle: string
          description: string | null
          etablissement_id: string
          id: string
          updated_at: string
          valeur: string
        }
        Insert: {
          cle: string
          description?: string | null
          etablissement_id: string
          id?: string
          updated_at?: string
          valeur: string
        }
        Update: {
          cle?: string
          description?: string | null
          etablissement_id?: string
          id?: string
          updated_at?: string
          valeur?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametres_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces_caisse: {
        Row: {
          beneficiaire: string
          created_at: string
          created_by: string | null
          date_piece: string
          etablissement_id: string
          id: string
          montant: number
          motif: string
          numero: string
          operation_id: string | null
          type_piece: string
        }
        Insert: {
          beneficiaire: string
          created_at?: string
          created_by?: string | null
          date_piece?: string
          etablissement_id: string
          id?: string
          montant: number
          motif: string
          numero: string
          operation_id?: string | null
          type_piece?: string
        }
        Update: {
          beneficiaire?: string
          created_at?: string
          created_by?: string | null
          date_piece?: string
          etablissement_id?: string
          id?: string
          montant?: number
          motif?: string
          numero?: string
          operation_id?: string | null
          type_piece?: string
        }
        Relationships: [
          {
            foreignKeyName: "pieces_caisse_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pieces_caisse_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "caisse_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          nom_complet: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id: string
          nom_complet?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          nom_complet?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          chambre_id: string
          client_id: string
          created_at: string
          created_by: string | null
          date_arrivee: string
          date_depart: string
          etablissement_id: string
          id: string
          nb_personnes: number
          notes: string | null
          prix_nuit: number
          statut: string
          taxe_nuit: number
          updated_at: string
        }
        Insert: {
          chambre_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          date_arrivee: string
          date_depart: string
          etablissement_id: string
          id?: string
          nb_personnes?: number
          notes?: string | null
          prix_nuit: number
          statut?: string
          taxe_nuit?: number
          updated_at?: string
        }
        Update: {
          chambre_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_arrivee?: string
          date_depart?: string
          etablissement_id?: string
          id?: string
          nb_personnes?: number
          notes?: string | null
          prix_nuit?: number
          statut?: string
          taxe_nuit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_chambre_id_fkey"
            columns: ["chambre_id"]
            isOneToOne: false
            referencedRelation: "chambres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      taxes_sejour: {
        Row: {
          created_at: string
          date_nuitee: string
          date_reversement: string | null
          etablissement_id: string
          id: string
          montant_total: number
          montant_unitaire: number
          nb_nuits: number
          reservation_id: string | null
          reverse: boolean
        }
        Insert: {
          created_at?: string
          date_nuitee: string
          date_reversement?: string | null
          etablissement_id: string
          id?: string
          montant_total: number
          montant_unitaire: number
          nb_nuits?: number
          reservation_id?: string | null
          reverse?: boolean
        }
        Update: {
          created_at?: string
          date_nuitee?: string
          date_reversement?: string | null
          etablissement_id?: string
          id?: string
          montant_total?: number
          montant_unitaire?: number
          nb_nuits?: number
          reservation_id?: string | null
          reverse?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "taxes_sejour_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxes_sejour_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reception" | "comptable"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "reception", "comptable"],
    },
  },
} as const
