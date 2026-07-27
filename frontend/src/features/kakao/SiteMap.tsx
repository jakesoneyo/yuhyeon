// 현장 위치를 카카오맵에 핀으로 표시(F8). VITE_KAKAO_MAP_APP_KEY가 없으면 스크립트를 아예
// 주입하지 않고 안내 플레이스홀더만 그려 앱이 죽지 않게 방어한다.
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { SiteSummary } from "@/types/site.schema";
import { loadKakaoMapSdk, type KakaoMap } from "./kakaoLoader";

interface SiteMapProps {
  sites: SiteSummary[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 }; // 대한민국 중심 근사치(현장 없을 때 초기 뷰)

function Placeholder() {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-chip bg-surface-2 text-sm text-muted">
      <MapPin size={20} />
      <span>카카오맵 API 키 설정 필요</span>
    </div>
  );
}

export function SiteMap({ sites, selectedCode, onSelect }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!KAKAO_APP_KEY || !containerRef.current) return;
    let cancelled = false;

    loadKakaoMapSdk(KAKAO_APP_KEY)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(
            DEFAULT_CENTER.lat,
            DEFAULT_CENTER.lng,
          ),
          level: 12,
        });
        setReady(true);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, []);

  // 현장 목록이 바뀔 때마다 마커를 다시 그리고, 전체 마커가 보이도록 지도 범위를 맞춘다.
  useEffect(() => {
    if (!ready || !mapRef.current || sites.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();

    sites.forEach((site) => {
      const position = new window.kakao.maps.LatLng(site.lat, site.lng);
      const marker = new window.kakao.maps.Marker({
        position,
        map: mapRef.current!,
      });
      window.kakao.maps.event.addListener(marker, "click", () =>
        onSelect(site.code),
      );
      bounds.extend(position);
    });

    mapRef.current.setBounds(bounds);
  }, [ready, sites, onSelect]);

  // 선택된 현장이 바뀌면 지도 중심을 그 위치로 옮겨 어느 핀인지 바로 알아볼 수 있게 한다.
  useEffect(() => {
    if (!ready || !mapRef.current || !selectedCode) return;
    const site = sites.find((s) => s.code === selectedCode);
    if (!site) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(site.lat, site.lng));
  }, [ready, selectedCode, sites]);

  if (!KAKAO_APP_KEY || failed) {
    return <Placeholder />;
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[240px] w-full rounded-chip"
    />
  );
}
