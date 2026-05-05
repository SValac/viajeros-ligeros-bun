import type { Tables, TablesUpdate } from '~/types/database.types';
import type { AccommodationPayment, AccommodationPaymentFormData, BusPayment, BusPaymentFormData, ProviderPayment, ProviderPaymentFormData, Quotation, QuotationAccommodation, QuotationAccommodationDetail, QuotationAccommodationFormData, QuotationBus, QuotationBusFormData, QuotationFetchResult, QuotationFormData, QuotationProvider, QuotationProviderFormData, QuotationPublicPrice, QuotationPublicPriceFormData } from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';

import {
  mapAccommodationPaymentRowToDomain,
  mapBusPaymentRowToDomain,
  mapProviderPaymentRowToDomain,
  mapQuotationAccommodationDetailRowToDomain,
  mapQuotationAccommodationRowToDomain,
  mapQuotationBusRowToDomain,
  mapQuotationProviderRowToDomain,
  mapQuotationPublicPriceRowToDomain,
  mapQuotationRowToDomain,
} from '~/utils/mappers';

import type { RoomSlot } from './use-quotation-domain';

export function useQuotationRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Quotation[]> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error)
      throw error;

    return (data ?? []).map(mapQuotationRowToDomain);
  }

  async function fetchByTravel(travelId: string): Promise<QuotationFetchResult | null> {
    const { data: quotRow, error: quotErr } = await supabase
      .from('quotations')
      .select('*')
      .eq('travel_id', travelId)
      .maybeSingle();

    if (quotErr)
      throw quotErr;
    if (!quotRow)
      return null;

    const quotationId = quotRow.id;

    const [providersResult, accommodationsResult, publicPricesResult, busesResult]
      = await Promise.all([
        supabase
          .from('quotation_providers')
          .select('*, provider_payments(*)')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_accommodations')
          .select('*, quotation_accommodation_details(*), accommodation_payments(*)')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_public_prices')
          .select('*')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_buses')
          .select('*, bus_payments(*)')
          .eq('quotation_id', quotationId),
      ]);

    if (providersResult.error)
      throw providersResult.error;
    if (accommodationsResult.error)
      throw accommodationsResult.error;
    if (publicPricesResult.error)
      throw publicPricesResult.error;
    if (busesResult.error)
      throw busesResult.error;

    const providers = (providersResult.data ?? [])
      .map(row => mapQuotationProviderRowToDomain(row));

    const providerPayments = (providersResult.data ?? [])
      .flatMap(row => (row.provider_payments ?? []).map(mapProviderPaymentRowToDomain));

    const accommodations = (accommodationsResult.data ?? [])
      .map((row) => {
        const details = (row.quotation_accommodation_details ?? [])
          .map(d => ({
            ...mapQuotationAccommodationDetailRowToDomain(d),
            costPerPerson: d.price_per_night / d.max_occupancy,
          }));
        return mapQuotationAccommodationRowToDomain(row, details);
      });

    const accommodationPayments = (accommodationsResult.data ?? [])
      .flatMap(row => (row.accommodation_payments ?? [])
        .map(mapAccommodationPaymentRowToDomain),
      );

    const buses = (busesResult.data ?? [])
      .map(row => mapQuotationBusRowToDomain(row));

    const busPayments = (busesResult.data ?? [])
      .flatMap(row =>
        (row.bus_payments ?? []).map(mapBusPaymentRowToDomain),
      );

    return {
      quotation: mapQuotationRowToDomain(quotRow),
      providers,
      providerPayments,
      accommodations,
      accommodationPayments,
      publicPrices: (publicPricesResult.data ?? []).map(mapQuotationPublicPriceRowToDomain),
      buses,
      busPayments,
    };
  }

  async function insertQuotation(data: QuotationFormData): Promise<Quotation> {
    const { data: row, error } = await supabase
      .from('quotations')
      .insert(mapQuotationToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationRowToDomain(row);
  }

  async function updateQuotation(id: string, data: Partial<QuotationFormData>): Promise<Quotation> {
    const update: TablesUpdate<'quotations'> = {};
    if (data.busCapacity !== undefined)
      update.bus_capacity = data.busCapacity;
    if (data.minimumSeatTarget !== undefined)
      update.minimum_seat_target = data.minimumSeatTarget;
    if (data.seatPrice !== undefined)
      update.seat_price = data.seatPrice;
    if (data.status !== undefined)
      update.status = data.status;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error: err } = await supabase
      .from('quotations')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (err)
      throw err;

    return mapQuotationRowToDomain(row);
  }

  async function insertProvider(data: QuotationProviderFormData): Promise<QuotationProvider> {
    const { data: row, error } = await supabase
      .from('quotation_providers')
      .insert(mapQuotationProviderToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationProviderRowToDomain(row);
  }

  async function updateProvider(id: string, data: Partial<QuotationProviderFormData>): Promise<QuotationProvider> {
    const update: TablesUpdate<'quotation_providers'> = {};
    if (data.providerId !== undefined)
      update.provider_id = data.providerId;
    if (data.serviceDescription !== undefined)
      update.service_description = data.serviceDescription;
    if (data.remarks !== undefined)
      update.remarks = data.remarks ?? null;
    if (data.totalCost !== undefined)
      update.total_cost = data.totalCost;
    if (data.paymentMethod !== undefined)
      update.payment_method = data.paymentMethod;
    if (data.splitType !== undefined)
      update.split_type = data.splitType;
    if (data.confirmed !== undefined)
      update.confirmed = data.confirmed;

    const { data: row, error } = await supabase
      .from('quotation_providers')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationProviderRowToDomain(row);
  }

  async function deleteProvider(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotation_providers')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function toggleProviderConfirmado(id: string, confirmed: boolean): Promise<void> {
    const { error } = await supabase
      .from('quotation_providers')
      .update({ confirmed })
      .eq('id', id);

    if (error)
      throw error;
  }

  async function insertProviderPayment(data: ProviderPaymentFormData): Promise<ProviderPayment> {
    const { data: row, error } = await supabase
      .from('provider_payments')
      .insert(mapProviderPaymentToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapProviderPaymentRowToDomain(row);
  }

  async function updateProviderPayment(id: string, data: Partial<ProviderPaymentFormData>): Promise<ProviderPayment> {
    const update: TablesUpdate<'provider_payments'> = {};
    if (data.amount !== undefined)
      update.amount = data.amount;
    if (data.paymentDate !== undefined)
      update.payment_date = data.paymentDate;
    if (data.paymentType !== undefined)
      update.payment_type = data.paymentType;
    if (data.concept !== undefined)
      update.concept = data.concept ?? null;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('provider_payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapProviderPaymentRowToDomain(row);
  }

  async function deleteProviderPayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('provider_payments')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function toggleConfirmAccommodation(id: string, confirmed: boolean): Promise<void> {
    const { error } = await supabase
      .from('quotation_accommodations')
      .update({ confirmed })
      .eq('id', id);

    if (error)
      throw error;
  }

  async function insertAccommodationPayment(data: AccommodationPaymentFormData): Promise<AccommodationPayment> {
    const { data: row, error } = await supabase
      .from('accommodation_payments')
      .insert(mapAccommodationPaymentToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapAccommodationPaymentRowToDomain(row);
  }

  async function updateAccommodationPayment(id: string, data: Partial<AccommodationPaymentFormData>): Promise<AccommodationPayment> {
    const update: TablesUpdate<'accommodation_payments'> = {};
    if (data.amount !== undefined)
      update.amount = data.amount;
    if (data.paymentDate !== undefined)
      update.payment_date = data.paymentDate;
    if (data.paymentType !== undefined)
      update.payment_type = data.paymentType;
    if (data.concept !== undefined)
      update.concept = data.concept ?? null;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('accommodation_payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapAccommodationPaymentRowToDomain(row);
  }

  async function deleteAccommodationPayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('accommodation_payments')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function insertPublicPrice(data: QuotationPublicPriceFormData): Promise<QuotationPublicPrice> {
    const { data: row, error } = await supabase
      .from('quotation_public_prices')
      .insert(mapQuotationPublicPriceToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationPublicPriceRowToDomain(row);
  }

  async function updatePublicPrice(id: string, data: Partial<QuotationPublicPriceFormData>): Promise<QuotationPublicPrice> {
    const update: TablesUpdate<'quotation_public_prices'> = {};
    if (data.priceType !== undefined)
      update.price_type = data.priceType;
    if (data.description !== undefined)
      update.description = data.description;
    if (data.pricePerPerson !== undefined)
      update.price_per_person = data.pricePerPerson;
    if (data.roomType !== undefined)
      update.room_type = data.roomType ?? null;
    if (data.ageGroup !== undefined)
      update.age_group = data.ageGroup ?? null;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('quotation_public_prices')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationPublicPriceRowToDomain(row);
  }

  async function deletePublicPrice(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotation_public_prices')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function insertBusPayment(data: BusPaymentFormData): Promise<BusPayment> {
    const { data: row, error } = await supabase
      .from('bus_payments')
      .insert(mapBusPaymentToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapBusPaymentRowToDomain(row);
  }

  async function updateBusPayment(id: string, data: Partial<BusPaymentFormData>): Promise<BusPayment> {
    const update: TablesUpdate<'bus_payments'> = {};
    if (data.amount !== undefined)
      update.amount = data.amount;
    if (data.paymentDate !== undefined)
      update.payment_date = data.paymentDate;
    if (data.paymentType !== undefined)
      update.payment_type = data.paymentType;
    if (data.concept !== undefined)
      update.concept = data.concept ?? null;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('bus_payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapBusPaymentRowToDomain(row);
  }

  async function deleteBusPayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('bus_payments')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }
  async function insertAccommodation(data: QuotationAccommodationFormData): Promise<QuotationAccommodation> {
    const detalles = data.details.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));
    const totalCost = detalles.reduce(
      (sum, d) => sum + d.pricePerNight * data.nightCount * d.quantity,
      0,
    );

    const { data: accRow, error: accErr } = await supabase
      .from('quotation_accommodations')
      .insert({
        quotation_id: data.quotationId,
        provider_id: data.providerId,
        night_count: data.nightCount,
        total_cost: totalCost,
        payment_method: data.paymentMethod,
        confirmed: data.confirmed,
      })
      .select()
      .single();

    if (accErr)
      throw accErr;

    const { data: detailRows, error: detErr } = await supabase
      .from('quotation_accommodation_details')
      .insert(detalles.map(d => ({
        quotation_accommodation_id: accRow.id,
        hotel_room_type_id: d.roomTypeId,
        quantity: d.quantity,
        price_per_night: d.pricePerNight,
        max_occupancy: d.maxOccupancy,
      })))
      .select();

    if (detErr)
      throw detErr;

    const mappedDetails = (detailRows ?? []).map(d => ({
      ...mapQuotationAccommodationDetailRowToDomain(d),
      costPerPerson: d.price_per_night / d.max_occupancy,
    }));

    return mapQuotationAccommodationRowToDomain(accRow, mappedDetails);
  }

  async function updateAccommodation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
    existingNightCount: number,
    existingDetails: QuotationAccommodationDetail[],
  ): Promise<QuotationAccommodation> {
    const detallesBase = data.details ?? existingDetails;
    const detalles = detallesBase.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));
    const totalCost = detalles.reduce(
      (sum, d) => sum + d.pricePerNight * (data.nightCount ?? existingNightCount) * d.quantity,
      0,
    );

    const accUpdate: TablesUpdate<'quotation_accommodations'> = { total_cost: totalCost };
    if (data.providerId !== undefined)
      accUpdate.provider_id = data.providerId;
    if (data.nightCount !== undefined)
      accUpdate.night_count = data.nightCount;
    if (data.paymentMethod !== undefined)
      accUpdate.payment_method = data.paymentMethod;
    if (data.confirmed !== undefined)
      accUpdate.confirmed = data.confirmed;

    const { data: updatedRow, error: accErr } = await supabase
      .from('quotation_accommodations')
      .update(accUpdate)
      .eq('id', id)
      .select()
      .single();

    if (accErr)
      throw accErr;

    const { error: delErr } = await supabase
      .from('quotation_accommodation_details')
      .delete()
      .eq('quotation_accommodation_id', id);

    if (delErr)
      throw delErr;

    const { data: newDetailRows, error: detErr } = await supabase
      .from('quotation_accommodation_details')
      .insert(detalles.map(d => ({
        quotation_accommodation_id: id,
        hotel_room_type_id: d.roomTypeId,
        quantity: d.quantity,
        price_per_night: d.pricePerNight,
        max_occupancy: d.maxOccupancy,
      })))
      .select();

    if (detErr)
      throw detErr;

    const mappedDetails = (newDetailRows ?? []).map(d => ({
      ...mapQuotationAccommodationDetailRowToDomain(d),
      costPerPerson: d.price_per_night / d.max_occupancy,
    }));

    return mapQuotationAccommodationRowToDomain(updatedRow, mappedDetails);
  }

  async function deleteAccommodation(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotation_accommodations')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function insertBus(
    data: QuotationBusFormData,
    travelId: string,
  ): Promise<{ quotationBus: QuotationBus; travelBusRow: Tables<'travel_buses'> }> {
    const { data: busRow, error: busErr } = await supabase
      .from('quotation_buses')
      .insert(mapQuotationBusToInsert(data))
      .select()
      .single();
    if (busErr)
      throw busErr;

    const quotationBus = mapQuotationBusRowToDomain(busRow);

    const { data: travelBusRow, error: travelBusErr } = await supabase
      .from('travel_buses')
      .insert({
        travel_id: travelId,
        quotation_bus_id: quotationBus.id,
        provider_id: quotationBus.providerId,
        model: quotationBus.unitNumber,
        operator1_name: 'Por asignar',
        operator1_phone: 'Por asignar',
        seat_count: quotationBus.capacity,
        rental_price: quotationBus.totalCost,
      })
      .select()
      .single();

    if (travelBusErr)
      throw new Error(`No se pudo crear el autobús en el viaje: ${travelBusErr.message}`);

    return { quotationBus, travelBusRow };
  }

  async function updateBus(id: string, data: Partial<QuotationBusFormData>): Promise<QuotationBus> {
    const update: TablesUpdate<'quotation_buses'> = {};
    if (data.providerId !== undefined)
      update.provider_id = data.providerId;
    if (data.unitNumber !== undefined)
      update.unit_number = data.unitNumber;
    if (data.capacity !== undefined)
      update.capacity = data.capacity;
    if (data.status !== undefined)
      update.status = data.status;
    if (data.totalCost !== undefined)
      update.total_cost = data.totalCost;
    if (data.splitType !== undefined)
      update.split_type = data.splitType;
    if (data.paymentMethod !== undefined)
      update.payment_method = data.paymentMethod;
    if (data.remarks !== undefined)
      update.remarks = data.remarks ?? null;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;
    if (data.confirmed !== undefined)
      update.confirmed = data.confirmed;
    if (data.coordinatorIds !== undefined)
      update.coordinator_ids = data.coordinatorIds as unknown as import('~/types/database.types').Json;

    const { data: row, error: busErr } = await supabase
      .from('quotation_buses')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (busErr)
      throw busErr;

    const updated = mapQuotationBusRowToDomain(row);

    const { error: travelBusErr } = await supabase
      .from('travel_buses')
      .update({ rental_price: updated.totalCost })
      .eq('quotation_bus_id', id);

    if (travelBusErr)
      throw new Error(`No se pudo actualizar el autobús en el viaje: ${travelBusErr.message}`);

    return updated;
  }

  async function deleteBus(id: string): Promise<void> {
    const { error } = await supabase
      .from('quotation_buses')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function updateSeatPrice(quotationId: string, price: number): Promise<void> {
    const { error } = await supabase
      .from('quotations')
      .update({ seat_price: price })
      .eq('id', quotationId);
    if (error)
      throw error;
  }

  async function getOccupiedAccommodationIds(travelId: string): Promise<Set<string>> {
    const { data } = await supabase
      .from('travelers')
      .select('travel_accommodation_id')
      .eq('travel_id', travelId)
      .not('travel_accommodation_id', 'is', null);
    return new Set<string>((data ?? []).map(r => r.travel_accommodation_id!));
  }

  async function deleteUnoccupiedAccommodations(ids: string[]): Promise<void> {
    if (ids.length === 0)
      return;
    const { error } = await supabase
      .from('travel_accommodations')
      .delete()
      .in('id', ids);
    if (error)
      throw new Error(`No se pudo eliminar habitaciones: ${error.message}`);
  }

  async function insertTravelAccommodations(
    travelId: string,
    slots: RoomSlot[],
  ): Promise<TravelAccommodation[]> {
    const { data, error } = await supabase
      .from('travel_accommodations')
      .insert(slots.map(slot => ({
        travel_id: travelId,
        provider_id: slot.providerId,
        hotel_room_type_id: slot.hotelRoomTypeId ?? null,
        max_occupancy: slot.maxOccupancy,
        room_number: null,
        floor: null,
      })))
      .select();
    if (error)
      throw new Error(`No se pudo insertar habitaciones: ${error.message}`);
    return (data ?? []).map(mapTravelAccommodationRowToDomain);
  }

  return {
    fetchAll,
    fetchByTravel,
    insertQuotation,
    updateQuotation,
    insertProvider,
    updateProvider,
    deleteProvider,
    toggleProviderConfirmado,
    insertProviderPayment,
    updateProviderPayment,
    deleteProviderPayment,
    toggleConfirmAccommodation,
    insertAccommodationPayment,
    updateAccommodationPayment,
    deleteAccommodationPayment,
    insertPublicPrice,
    updatePublicPrice,
    deletePublicPrice,
    insertBusPayment,
    updateBusPayment,
    deleteBusPayment,
    insertAccommodation,
    updateAccommodation,
    deleteAccommodation,
    insertBus,
    updateBus,
    deleteBus,
    updateSeatPrice,
    getOccupiedAccommodationIds,
    deleteUnoccupiedAccommodations,
    insertTravelAccommodations,
  };
}
