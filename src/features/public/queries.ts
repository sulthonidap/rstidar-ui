import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { CareType, PublicOrganization, Service, TrackedOrder, PaymentMethod } from '@/types/models';

/** The partner RS, for the order form header (fails until the admin has set it up). */
export function usePublicOrganization() {
  return useQuery({
    queryKey: ['public', 'organization'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PublicOrganization }>('/public/organization');
      return data.data;
    },
    retry: false,
  });
}

export function usePublicServices() {
  return useQuery({
    queryKey: ['public', 'services'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Service[] }>('/public/services');
      return data.data;
    },
  });
}

export function useTrackOrder(code: string) {
  return useQuery({
    queryKey: ['public', 'track', code],
    queryFn: async () => {
      const { data } = await api.get<{ data: TrackedOrder }>(`/public/orders/${encodeURIComponent(code)}`);
      return data.data;
    },
    enabled: !!code,
    retry: false,
  });
}

export interface PublicOrderPayload {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  /** Optional: the API uses "Farmasi" when empty. */
  pickup_address?: string;
  dropoff_address: string;
  notes?: string;
  /** Optional patient data (when the patient isn't the recipient) and medical record no. */
  patient_name?: string;
  medical_record_no?: string;
  /** Destination map point (optional). */
  dropoff_lat?: number;
  dropoff_lng?: number;
  payment_method: PaymentMethod;
  /** Farmasi, when the Admin turned it on for the public form & kiosk. */
  care_type?: CareType;
  pharmacy_queue_no?: string | null;
  ward_id?: number | null;
  /** Honeypot — must stay empty; bots that fill it get rejected. */
  website: string;
}

/** A returning patient's details from their last order (to prefill the form). */
export interface ReturningPatient {
  customer_name: string;
  customer_phone: string;
  patient_name: string | null;
  medical_record_no: string | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}

/** "Pasien lama": look up the latest order by phone number or medical record number. */
export function useReturningPatient() {
  return useMutation({
    mutationFn: async (payload: { query: string }) =>
      (await api.post<{ data: ReturningPatient }>('/public/returning-patient', payload)).data.data,
  });
}

export function useCreatePublicOrder() {
  return useMutation({
    mutationFn: async (payload: PublicOrderPayload) => {
      const { data } = await api.post<{ data: { code: string } }>('/public/orders', payload);
      return data.data;
    },
  });
}

export interface QuoteParams {
  /** Leave out to quote every active service (see Quote.services). */
  service_id?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  /** Only when the pickup isn't the RS point. */
  pickup_lat?: number;
  pickup_lng?: number;
}

export interface Quote {
  price: number;
  /** Road distance RS → destination; null without a destination point. */
  distance_km: number | null;
  distance_source: 'road' | 'estimate' | null;
  /** The service prices by distance (else flat). */
  tiered: boolean;
  /** Outside the RS's service area: an order would be refused, whatever the service. */
  out_of_range: boolean;
  /** The RS's service area in km; null = no limit. */
  max_distance_km: number | null;
  /** Road shape RS → destination as [lat, lng] points; empty when the distance is estimated. */
  route?: [number, number][];
  /** Price of every active service for this destination. */
  services?: { service_id: number; price: number; tiered: boolean }[];
}

/** Price + road distance an order would get, as calculated on save. */
export function useQuote(params: QuoteParams | null) {
  return useQuery({
    queryKey: ['public', 'quote', params],
    queryFn: async () => {
      const { data } = await api.post<{ data: Quote }>('/public/quote', params);
      return data.data;
    },
    enabled: !!params,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
