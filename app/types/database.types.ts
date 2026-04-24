export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
  public: {
    Tables: {
      accommodation_payments: {
        Row: {
          amount: number;
          concept: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_accommodation_id: string;
        };
        Insert: {
          amount: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_accommodation_id: string;
        };
        Update: {
          amount?: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          payment_type?: Database['public']['Enums']['payment_type'];
          quotation_accommodation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accommodation_payments_quotation_accommodation_id_fkey';
            columns: ['quotation_accommodation_id'];
            isOneToOne: false;
            referencedRelation: 'quotation_accommodations';
            referencedColumns: ['id'];
          },
        ];
      };
      bus_payments: {
        Row: {
          amount: number;
          concept: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_bus_id: string;
        };
        Insert: {
          amount: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_bus_id: string;
        };
        Update: {
          amount?: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          payment_type?: Database['public']['Enums']['payment_type'];
          quotation_bus_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bus_payments_quotation_bus_id_fkey';
            columns: ['quotation_bus_id'];
            isOneToOne: false;
            referencedRelation: 'quotation_buses';
            referencedColumns: ['id'];
          },
        ];
      };
      buses: {
        Row: {
          active: boolean;
          brand: string | null;
          created_at: string;
          id: string;
          model: string | null;
          provider_id: string;
          rental_price: number;
          seat_count: number;
          updated_at: string;
          year: number | null;
        };
        Insert: {
          active?: boolean;
          brand?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          provider_id: string;
          rental_price: number;
          seat_count: number;
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          active?: boolean;
          brand?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          provider_id?: string;
          rental_price?: number;
          seat_count?: number;
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'buses_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
        ];
      };
      coordinators: {
        Row: {
          age: number;
          created_at: string;
          email: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string;
          updated_at: string;
        };
        Insert: {
          age: number;
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone: string;
          updated_at?: string;
        };
        Update: {
          age?: number;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hotel_room_types: {
        Row: {
          additional_details: string | null;
          beds: Json;
          cost_per_person: number;
          created_at: string;
          hotel_room_id: string;
          id: string;
          max_occupancy: number;
          price_per_night: number;
          room_count: number;
          updated_at: string;
        };
        Insert: {
          additional_details?: string | null;
          beds?: Json;
          cost_per_person: number;
          created_at?: string;
          hotel_room_id: string;
          id?: string;
          max_occupancy: number;
          price_per_night: number;
          room_count: number;
          updated_at?: string;
        };
        Update: {
          additional_details?: string | null;
          beds?: Json;
          cost_per_person?: number;
          created_at?: string;
          hotel_room_id?: string;
          id?: string;
          max_occupancy?: number;
          price_per_night?: number;
          room_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_room_types_hotel_room_id_fkey';
            columns: ['hotel_room_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      hotel_rooms: {
        Row: {
          created_at: string;
          id: string;
          provider_id: string;
          total_rooms: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          provider_id: string;
          total_rooms?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          provider_id?: string;
          total_rooms?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_rooms_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          notes: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          travel_id: string;
          traveler_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          travel_id: string;
          traveler_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          payment_type?: Database['public']['Enums']['payment_type'];
          travel_id?: string;
          traveler_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_traveler_id_fkey';
            columns: ['traveler_id'];
            isOneToOne: false;
            referencedRelation: 'travelers';
            referencedColumns: ['id'];
          },
        ];
      };
      provider_payments: {
        Row: {
          amount: number;
          concept: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_provider_id: string;
        };
        Insert: {
          amount: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date: string;
          payment_type: Database['public']['Enums']['payment_type'];
          quotation_provider_id: string;
        };
        Update: {
          amount?: number;
          concept?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          payment_type?: Database['public']['Enums']['payment_type'];
          quotation_provider_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provider_payments_quotation_provider_id_fkey';
            columns: ['quotation_provider_id'];
            isOneToOne: false;
            referencedRelation: 'quotation_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      providers: {
        Row: {
          active: boolean;
          category: Database['public']['Enums']['provider_category'];
          contact_email: string | null;
          contact_name: string | null;
          contact_notes: string | null;
          contact_phone: string | null;
          created_at: string;
          description: string | null;
          id: string;
          location_city: string;
          location_country: string;
          location_state: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category: Database['public']['Enums']['provider_category'];
          contact_email?: string | null;
          contact_name?: string | null;
          contact_notes?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_city: string;
          location_country: string;
          location_state: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: Database['public']['Enums']['provider_category'];
          contact_email?: string | null;
          contact_name?: string | null;
          contact_notes?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location_city?: string;
          location_country?: string;
          location_state?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotation_accommodation_details: {
        Row: {
          hotel_room_type_id: string;
          id: string;
          max_occupancy: number;
          price_per_night: number;
          quantity: number;
          quotation_accommodation_id: string;
        };
        Insert: {
          hotel_room_type_id: string;
          id?: string;
          max_occupancy: number;
          price_per_night: number;
          quantity: number;
          quotation_accommodation_id: string;
        };
        Update: {
          hotel_room_type_id?: string;
          id?: string;
          max_occupancy?: number;
          price_per_night?: number;
          quantity?: number;
          quotation_accommodation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_accommodation_details_hotel_room_type_id_fkey';
            columns: ['hotel_room_type_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_room_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotation_accommodation_details_quotation_accommodation_id_fkey';
            columns: ['quotation_accommodation_id'];
            isOneToOne: false;
            referencedRelation: 'quotation_accommodations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotation_accommodations: {
        Row: {
          confirmed: boolean;
          created_at: string;
          id: string;
          night_count: number;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          total_cost: number;
          updated_at: string;
        };
        Insert: {
          confirmed?: boolean;
          created_at?: string;
          id?: string;
          night_count: number;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          total_cost: number;
          updated_at?: string;
        };
        Update: {
          confirmed?: boolean;
          created_at?: string;
          id?: string;
          night_count?: number;
          payment_method?: Database['public']['Enums']['payment_type'];
          provider_id?: string;
          quotation_id?: string;
          total_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_accommodations_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotation_accommodations_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotation_buses: {
        Row: {
          capacity: number;
          confirmed: boolean;
          coordinator_ids: Json;
          created_at: string;
          id: string;
          notes: string | null;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          remarks: string | null;
          split_type: Database['public']['Enums']['cost_split_type'];
          status: Database['public']['Enums']['quotation_bus_status'];
          total_cost: number;
          unit_number: string;
          updated_at: string;
        };
        Insert: {
          capacity: number;
          confirmed?: boolean;
          coordinator_ids?: Json;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          remarks?: string | null;
          split_type: Database['public']['Enums']['cost_split_type'];
          status?: Database['public']['Enums']['quotation_bus_status'];
          total_cost: number;
          unit_number: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          confirmed?: boolean;
          coordinator_ids?: Json;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_method?: Database['public']['Enums']['payment_type'];
          provider_id?: string;
          quotation_id?: string;
          remarks?: string | null;
          split_type?: Database['public']['Enums']['cost_split_type'];
          status?: Database['public']['Enums']['quotation_bus_status'];
          total_cost?: number;
          unit_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_buses_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotation_buses_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotation_providers: {
        Row: {
          confirmed: boolean;
          id: string;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          remarks: string | null;
          service_description: string;
          split_type: Database['public']['Enums']['cost_split_type'];
          total_cost: number;
        };
        Insert: {
          confirmed?: boolean;
          id?: string;
          payment_method: Database['public']['Enums']['payment_type'];
          provider_id: string;
          quotation_id: string;
          remarks?: string | null;
          service_description: string;
          split_type: Database['public']['Enums']['cost_split_type'];
          total_cost: number;
        };
        Update: {
          confirmed?: boolean;
          id?: string;
          payment_method?: Database['public']['Enums']['payment_type'];
          provider_id?: string;
          quotation_id?: string;
          remarks?: string | null;
          service_description?: string;
          split_type?: Database['public']['Enums']['cost_split_type'];
          total_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_providers_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotation_providers_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotation_public_prices: {
        Row: {
          age_group: string | null;
          created_at: string;
          description: string;
          id: string;
          notes: string | null;
          price_per_person: number;
          price_type: string;
          quotation_id: string;
          room_type: string | null;
          updated_at: string;
        };
        Insert: {
          age_group?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          notes?: string | null;
          price_per_person: number;
          price_type: string;
          quotation_id: string;
          room_type?: string | null;
          updated_at?: string;
        };
        Update: {
          age_group?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          notes?: string | null;
          price_per_person?: number;
          price_type?: string;
          quotation_id?: string;
          room_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_public_prices_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotations: {
        Row: {
          bus_capacity: number;
          created_at: string;
          id: string;
          minimum_seat_target: number;
          notes: string | null;
          seat_price: number;
          status: Database['public']['Enums']['quotation_status'];
          travel_id: string;
          updated_at: string;
        };
        Insert: {
          bus_capacity: number;
          created_at?: string;
          id?: string;
          minimum_seat_target: number;
          notes?: string | null;
          seat_price: number;
          status?: Database['public']['Enums']['quotation_status'];
          travel_id: string;
          updated_at?: string;
        };
        Update: {
          bus_capacity?: number;
          created_at?: string;
          id?: string;
          minimum_seat_target?: number;
          notes?: string | null;
          seat_price?: number;
          status?: Database['public']['Enums']['quotation_status'];
          travel_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quotations_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      travel_activities: {
        Row: {
          day: number;
          description: string;
          id: string;
          location: string | null;
          time: string | null;
          title: string;
          travel_id: string;
        };
        Insert: {
          day: number;
          description: string;
          id?: string;
          location?: string | null;
          time?: string | null;
          title: string;
          travel_id: string;
        };
        Update: {
          day?: number;
          description?: string;
          id?: string;
          location?: string | null;
          time?: string | null;
          title?: string;
          travel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_activities_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      travel_buses: {
        Row: {
          brand: string | null;
          bus_id: string | null;
          id: string;
          model: string | null;
          operator1_name: string;
          operator1_phone: string;
          operator2_name: string | null;
          operator2_phone: string | null;
          provider_id: string;
          rental_price: number;
          seat_count: number;
          travel_id: string;
          year: number | null;
        };
        Insert: {
          brand?: string | null;
          bus_id?: string | null;
          id?: string;
          model?: string | null;
          operator1_name: string;
          operator1_phone: string;
          operator2_name?: string | null;
          operator2_phone?: string | null;
          provider_id: string;
          rental_price: number;
          seat_count: number;
          travel_id: string;
          year?: number | null;
        };
        Update: {
          brand?: string | null;
          bus_id?: string | null;
          id?: string;
          model?: string | null;
          operator1_name?: string;
          operator1_phone?: string;
          operator2_name?: string | null;
          operator2_phone?: string | null;
          provider_id?: string;
          rental_price?: number;
          seat_count?: number;
          travel_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_buses_bus_id_fkey';
            columns: ['bus_id'];
            isOneToOne: false;
            referencedRelation: 'buses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travel_buses_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travel_buses_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      travel_coordinators: {
        Row: {
          coordinator_id: string;
          travel_id: string;
        };
        Insert: {
          coordinator_id: string;
          travel_id: string;
        };
        Update: {
          coordinator_id?: string;
          travel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_coordinators_coordinator_id_fkey';
            columns: ['coordinator_id'];
            isOneToOne: false;
            referencedRelation: 'coordinators';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travel_coordinators_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      travel_services: {
        Row: {
          description: string | null;
          id: string;
          included: boolean;
          name: string;
          provider_id: string | null;
          travel_id: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          included?: boolean;
          name: string;
          provider_id?: string | null;
          travel_id: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          included?: boolean;
          name?: string;
          provider_id?: string | null;
          travel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_services_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travel_services_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      traveler_account_configs: {
        Row: {
          child_price: number | null;
          discounts: Json;
          public_price_amount: number | null;
          public_price_id: string | null;
          surcharges: Json;
          travel_id: string;
          traveler_id: string;
          traveler_type: Database['public']['Enums']['traveler_type'];
        };
        Insert: {
          child_price?: number | null;
          discounts?: Json;
          public_price_amount?: number | null;
          public_price_id?: string | null;
          surcharges?: Json;
          travel_id: string;
          traveler_id: string;
          traveler_type?: Database['public']['Enums']['traveler_type'];
        };
        Update: {
          child_price?: number | null;
          discounts?: Json;
          public_price_amount?: number | null;
          public_price_id?: string | null;
          surcharges?: Json;
          travel_id?: string;
          traveler_id?: string;
          traveler_type?: Database['public']['Enums']['traveler_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'traveler_account_configs_public_price_fkey';
            columns: ['public_price_id'];
            isOneToOne: false;
            referencedRelation: 'quotation_public_prices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'traveler_account_configs_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'traveler_account_configs_traveler_id_fkey';
            columns: ['traveler_id'];
            isOneToOne: false;
            referencedRelation: 'travelers';
            referencedColumns: ['id'];
          },
        ];
      };
      travelers: {
        Row: {
          boarding_point: string;
          created_at: string;
          first_name: string;
          id: string;
          is_representative: boolean;
          last_name: string;
          phone: string;
          representative_id: string | null;
          seat: string;
          travel_bus_id: string | null;
          travel_id: string;
          updated_at: string;
        };
        Insert: {
          boarding_point: string;
          created_at?: string;
          first_name: string;
          id?: string;
          is_representative?: boolean;
          last_name: string;
          phone: string;
          representative_id?: string | null;
          seat: string;
          travel_bus_id?: string | null;
          travel_id: string;
          updated_at?: string;
        };
        Update: {
          boarding_point?: string;
          created_at?: string;
          first_name?: string;
          id?: string;
          is_representative?: boolean;
          last_name?: string;
          phone?: string;
          representative_id?: string | null;
          seat?: string;
          travel_bus_id?: string | null;
          travel_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travelers_representative_id_fkey';
            columns: ['representative_id'];
            isOneToOne: false;
            referencedRelation: 'travelers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travelers_travel_bus_id_fkey';
            columns: ['travel_bus_id'];
            isOneToOne: false;
            referencedRelation: 'travel_buses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travelers_travel_id_fkey';
            columns: ['travel_id'];
            isOneToOne: false;
            referencedRelation: 'travels';
            referencedColumns: ['id'];
          },
        ];
      };
      travels: {
        Row: {
          accumulated_travelers: number | null;
          created_at: string;
          description: string;
          destination: string;
          end_date: string;
          id: string;
          image_url: string | null;
          internal_notes: string | null;
          minimum_seats: number | null;
          price: number;
          projected_profit: number | null;
          start_date: string;
          status: Database['public']['Enums']['travel_status'];
          total_operation_cost: number | null;
          updated_at: string;
        };
        Insert: {
          accumulated_travelers?: number | null;
          created_at?: string;
          description: string;
          destination: string;
          end_date: string;
          id?: string;
          image_url?: string | null;
          internal_notes?: string | null;
          minimum_seats?: number | null;
          price: number;
          projected_profit?: number | null;
          start_date: string;
          status?: Database['public']['Enums']['travel_status'];
          total_operation_cost?: number | null;
          updated_at?: string;
        };
        Update: {
          accumulated_travelers?: number | null;
          created_at?: string;
          description?: string;
          destination?: string;
          end_date?: string;
          id?: string;
          image_url?: string | null;
          internal_notes?: string | null;
          minimum_seats?: number | null;
          price?: number;
          projected_profit?: number | null;
          start_date?: string;
          status?: Database['public']['Enums']['travel_status'];
          total_operation_cost?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      cost_split_type: 'minimum' | 'total';
      payment_type: 'cash' | 'transfer';
      provider_category:
        | 'guides'
        | 'transportation'
        | 'accommodation'
        | 'bus_agencies'
        | 'food_services'
        | 'other';
      quotation_bus_status: 'reserved' | 'confirmed' | 'pending';
      quotation_status: 'draft' | 'confirmed';
      travel_status:
        | 'pending'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled';
      traveler_type: 'adult' | 'child';
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
      ? R
      : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables']
    & DefaultSchema['Views'])
    ? (DefaultSchema['Tables']
      & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I;
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U;
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema['CompositeTypes']
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cost_split_type: ['minimum', 'total'],
      payment_type: ['cash', 'transfer'],
      provider_category: [
        'guides',
        'transportation',
        'accommodation',
        'bus_agencies',
        'food_services',
        'other',
      ],
      quotation_bus_status: ['reserved', 'confirmed', 'pending'],
      quotation_status: ['draft', 'confirmed'],
      travel_status: [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
      ],
      traveler_type: ['adult', 'child'],
    },
  },
} as const;
