import { MapIcon, RouteIcon } from 'lucide-react';

import { CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type MapView = 'paket' | 'rute';

/**
 * Header of the map card on the Order page for Admin & Ops: the title and a
 * full-width switch between package spread and courier routes.
 */
export default function MapViewTabs({ value, onChange }: { value: MapView; onChange: (v: MapView) => void }) {
  return (
    <div className="w-full space-y-3">
      <CardTitle className="text-lg">Peta pengiriman</CardTitle>
      <Tabs value={value} onValueChange={(v) => onChange(v as MapView)}>
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="paket" className="text-base">
            <MapIcon />
            Sebaran paket
          </TabsTrigger>
          <TabsTrigger value="rute" className="text-base">
            <RouteIcon />
            Rute kurir
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
