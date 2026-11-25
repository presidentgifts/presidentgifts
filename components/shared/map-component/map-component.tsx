"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Logo from "@/public/svg/PresidentLogo.svg";
import { Branch, ownBranches } from "@/constants/branches";
import { useBranches } from "@/hooks/use-branches";
import { getClientCountryCode } from "@/lib/locale-context-client";
import { Locale } from "@/lib/i18n-config";



const customIcon = L.icon({
  iconUrl: Logo.src,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

function FitMapToBranches({ branches }: { branches: Branch[] }) {
  const map = useMap();

  useEffect(() => {
    // Open the map on the visitor's country.
    const visible = ownBranches(getClientCountryCode(), branches);
    if (visible.length === 0) return;
    const bounds = L.latLngBounds(visible.map((branch) => [branch.lat, branch.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [map, branches]);

  return null;
}

function FlyToLocation({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 15, {
      animate: true,
      duration: 1.5,
    });
  }, [map, position]);
  return null;
}

const translations = {
  openInYandexMaps: {
    uz: "Yandex xaritada ochish",
    ru: "Открыть в Яндекс Картах",
    en: "Open in Yandex Maps",
    az: "Yandex Xəritədə aç",
    tj: "Дар Yandex Харита кушодан",
  },
};

export default function MapComponent({
  selectedPosition,
  lang = "uz",
  zoom,
}: {
  selectedPosition: [number, number] | null;
  zoom?: number;
  lang?: Locale;
}) {
  const branches = useBranches();
  return (
    <MapContainer
      center={[41.2995, 69.2401]}
      zoom={zoom ?? 13}
      scrollWheelZoom={false}
      className="w-full h-full z-0"
    >
      {/* <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            /> */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {branches.map((branch, index) => (
        <Marker
          key={index}
          position={[branch.lat, branch.lng]}
          icon={customIcon}
        >
          <Popup>
            <div className="text-sm">
              {branch.name[lang]}
              <br />
              <a
                href={`https://yandex.com/maps/?ll=${branch.lng},${branch.lat}&z=18`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {translations.openInYandexMaps[lang]}
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      <FitMapToBranches branches={branches} />
      {selectedPosition && <FlyToLocation position={selectedPosition} />}
    </MapContainer>
  );
}
