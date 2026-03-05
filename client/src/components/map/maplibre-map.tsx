import React, { forwardRef, useImperativeHandle, useRef } from "react";

export interface MapLibreMapRef {
  getMap: () => any;
  flyTo: (options: any) => void;
  setCenter: (center: [number, number]) => void;
}

interface MapLibreMapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  onLoad?: () => void;
  children?: React.ReactNode;
}

const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(
  ({ className, children }, ref) => {
    const mapRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
      flyTo: (options: any) => mapRef.current?.flyTo(options),
      setCenter: (center: [number, number]) => mapRef.current?.setCenter(center),
    }));

    return (
      <div ref={mapRef} className={className} style={{ width: "100%", height: "100%" }}>
        {children}
      </div>
    );
  }
);

MapLibreMap.displayName = "MapLibreMap";
export default MapLibreMap;
