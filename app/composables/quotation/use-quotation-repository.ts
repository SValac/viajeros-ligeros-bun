import type { Tables, TablesUpdate } from '~/types/database.types';
import type { AccommodationPayment, AccommodationPaymentFormData, BusPayment, BusPaymentFormData, ProviderOptOut, ProviderPayment, ProviderPaymentFormData, Quotation, QuotationAccommodation, QuotationAccommodationDetail, QuotationAccommodationFormData, QuotationBus, QuotationBusFormData, QuotationFetchResult, QuotationFormData, QuotationProvider, QuotationProviderFormData, QuotationPublicPrice, QuotationPublicPriceFormData } from '~/types/quotation';

import {
  mapAccommodationPaymentRowToDomain,
  mapBusPaymentRowToDomain,
  mapProviderCostFields,
  mapProviderOptOutRowToDomain,
  mapProviderPaymentRowToDomain,
  mapQuotationAccommodationDetailRowToDomain,
  mapQuotationAccommodationRowToDomain,
  mapQuotationBusRowToDomain,
  mapQuotationProviderRowToDomain,
  mapQuotationPublicPriceRowToDomain,
  mapQuotationRowToDomain,
} from '~/utils/mappers';

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
    if (data.totalSeats !== undefined)
      update.total_seats = data.totalSeats;
    if (data.minimumSeatTarget !== undefined)
      update.minimum_seat_target = data.minimumSeatTarget;
    if (data.seatPrice !== undefined)
      update.seat_price = data.seatPrice;
    if (data.status !== undefined)
      update.status = data.status;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;
    if (data.showPublicRoomType !== undefined)
      update.show_public_room_type = data.showPublicRoomType;
    if (data.showPublicDescription !== undefined)
      update.show_public_description = data.showPublicDescription;
    if (data.coordinatorsTakeSeats !== undefined)
      update.coordinators_take_seats = data.coordinatorsTakeSeats;

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
    if (data.costType !== undefined)
      Object.assign(update, mapProviderCostFields({ costType: data.costType, unitCost: data.unitCost, coordinatorsCourtesy: data.coordinatorsCourtesy ?? false }));
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

  /**
   * Sets whether a per-person provider gives the coordinators the service for free.
   * Allowed on confirmed quotations because it doesn't touch the seat price.
   * @returns The provider with the payable cost the database recomputed
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateProviderCourtesy(id: string, coordinatorsCourtesy: boolean): Promise<QuotationProvider> {
    const { data: row, error } = await supabase
      .from('quotation_providers')
      .update({ coordinators_courtesy: coordinatorsCourtesy })
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapQuotationProviderRowToDomain(row);
  }

  /**
   * Reads what's owed to every provider of a quotation. Travelers added, removed or
   * opted out change it in the database, so the store refreshes it afterwards.
   * @param quotationId - UUID of the quotation
   * @returns One `{ id, payableCost }` per quotation provider
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchProviderPayableCosts(quotationId: string): Promise<{ id: string; payableCost: number }[]> {
    const { data, error } = await supabase
      .from('quotation_providers')
      .select('id, payable_cost')
      .eq('quotation_id', quotationId);

    if (error)
      throw error;

    return data.map(row => ({ id: row.id, payableCost: row.payable_cost }));
  }

  /**
   * Travelers of a travel that don't take some optional service.
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchProviderOptOuts(travelId: string): Promise<ProviderOptOut[]> {
    const { data, error } = await supabase
      .from('quotation_provider_opt_outs')
      .select('*')
      .eq('travel_id', travelId);

    if (error)
      throw error;

    return data.map(mapProviderOptOutRowToDomain);
  }

  /**
   * Opts travelers out of a service. Already opted-out travelers are left as they are.
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertProviderOptOuts(optOuts: ProviderOptOut[]): Promise<void> {
    if (optOuts.length === 0)
      return;

    const { error } = await supabase
      .from('quotation_provider_opt_outs')
      .upsert(
        optOuts.map(o => ({
          quotation_provider_id: o.quotationProviderId,
          traveler_id: o.travelerId,
          travel_id: o.travelId,
        })),
        { onConflict: 'quotation_provider_id,traveler_id', ignoreDuplicates: true },
      );

    if (error)
      throw error;
  }

  /**
   * Opts travelers back into a service.
   * @throws {PostgrestError} on Supabase failure
   */
  async function deleteProviderOptOuts(quotationProviderId: string, travelerIds: string[]): Promise<void> {
    if (travelerIds.length === 0)
      return;

    const { error } = await supabase
      .from('quotation_provider_opt_outs')
      .delete()
      .eq('quotation_provider_id', quotationProviderId)
      .in('traveler_id', travelerIds);

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
    if (data.maxOccupancy !== undefined)
      update.max_occupancy = data.maxOccupancy;

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
  // total_cost is computed by the database from the travel's rooms (see the
  // lodging_cost_from_travel_rooms migration), so it's read back after the details are written.
  async function fetchAccommodationTotalCost(id: string): Promise<number> {
    const { data, error } = await supabase
      .from('quotation_accommodations')
      .select('total_cost')
      .eq('id', id)
      .single();

    if (error)
      throw error;

    return data.total_cost;
  }

  /**
   * Reads the current cost of every hotel in a quotation. Rooms added or removed on the
   * travel change these costs in the database, so the store refreshes them afterwards.
   * @param quotationId - UUID of the quotation
   * @returns One `{ id, totalCost }` per quotation hotel
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAccommodationCosts(quotationId: string): Promise<{ id: string; totalCost: number }[]> {
    const { data, error } = await supabase
      .from('quotation_accommodations')
      .select('id, total_cost')
      .eq('quotation_id', quotationId);

    if (error)
      throw error;

    return data.map(row => ({ id: row.id, totalCost: row.total_cost }));
  }

  async function insertAccommodationDetails(
    accommodationId: string,
    details: QuotationAccommodationFormData['details'],
  ): Promise<QuotationAccommodationDetail[]> {
    const { data: detailRows, error } = await supabase
      .from('quotation_accommodation_details')
      .insert(details.map(d => ({
        quotation_accommodation_id: accommodationId,
        hotel_room_type_id: d.roomTypeId,
        price_per_night: d.pricePerNight,
        max_occupancy: d.maxOccupancy,
      })))
      .select();

    if (error)
      throw error;

    return (detailRows ?? []).map(d => ({
      ...mapQuotationAccommodationDetailRowToDomain(d),
      costPerPerson: d.price_per_night / d.max_occupancy,
    }));
  }

  async function insertAccommodation(data: QuotationAccommodationFormData): Promise<QuotationAccommodation> {
    const { data: accRow, error: accErr } = await supabase
      .from('quotation_accommodations')
      .insert({
        quotation_id: data.quotationId,
        provider_id: data.providerId,
        night_count: data.nightCount,
        // Placeholder: the database computes it from the travel's rooms.
        total_cost: 0,
        payment_method: data.paymentMethod,
        confirmed: data.confirmed,
      })
      .select()
      .single();

    if (accErr)
      throw accErr;

    const mappedDetails = await insertAccommodationDetails(accRow.id, data.details);
    const totalCost = await fetchAccommodationTotalCost(accRow.id);

    return mapQuotationAccommodationRowToDomain({ ...accRow, total_cost: totalCost }, mappedDetails);
  }

  async function updateAccommodation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
    existingDetails: QuotationAccommodationDetail[],
  ): Promise<QuotationAccommodation> {
    const accUpdate: TablesUpdate<'quotation_accommodations'> = {};
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

    const mappedDetails = await insertAccommodationDetails(id, data.details ?? existingDetails);
    const totalCost = await fetchAccommodationTotalCost(id);

    return mapQuotationAccommodationRowToDomain({ ...updatedRow, total_cost: totalCost }, mappedDetails);
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
      update.coordinator_ids = data.coordinatorIds as unknown as NonNullable<import('~/types/database.types').Json>;

    const { data: row, error: busErr } = await supabase
      .from('quotation_buses')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (busErr)
      throw busErr;

    const updated = mapQuotationBusRowToDomain(row);

    // travel_buses is the operational projection of this bus (visible to coordinators,
    // unlike quotation_buses which carries the cost) — keep provider/unit/capacity in sync.
    const travelBusUpdate: TablesUpdate<'travel_buses'> = {};
    if (data.providerId !== undefined)
      travelBusUpdate.provider_id = updated.providerId;
    if (data.unitNumber !== undefined)
      travelBusUpdate.model = updated.unitNumber;
    if (data.capacity !== undefined)
      travelBusUpdate.seat_count = updated.capacity;

    if (Object.keys(travelBusUpdate).length > 0) {
      const { error: travelBusErr } = await supabase
        .from('travel_buses')
        .update(travelBusUpdate)
        .eq('quotation_bus_id', id);

      if (travelBusErr)
        throw new Error(`No se pudo sincronizar el autobús del viaje: ${travelBusErr.message}`);
    }

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
    const { data, error } = await supabase
      .from('traveler_room_assignments')
      .select('travel_accommodation_id')
      .eq('travel_id', travelId);
    // Treating a failed read as "no occupied rooms" would let the reconcile delete occupied ones.
    if (error)
      throw error;
    return new Set<string>(data.map(r => r.travel_accommodation_id));
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

  return {
    fetchAll,
    fetchByTravel,
    insertQuotation,
    updateQuotation,
    insertProvider,
    updateProvider,
    deleteProvider,
    toggleProviderConfirmado,
    updateProviderCourtesy,
    fetchProviderPayableCosts,
    fetchProviderOptOuts,
    insertProviderOptOuts,
    deleteProviderOptOuts,
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
    fetchAccommodationCosts,
    deleteUnoccupiedAccommodations,
  };
}
