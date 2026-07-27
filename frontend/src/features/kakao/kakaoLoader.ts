// 카카오맵 JS SDK 동적 로더. 키가 없는 호출부(SiteMap)는 이 파일의 로더 함수를 아예 부르지
// 않으므로 스크립트 주입 자체가 일어나지 않는다 — F8 방어적 동작의 핵심.
// 카카오맵 SDK는 타입 패키지를 따로 설치하지 않고(ponytail) 사용하는 만큼만 최소 인터페이스로 선언한다.
export interface KakaoLatLng {
  readonly __brand: "KakaoLatLng";
}

export interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
}

export interface KakaoMap {
  setBounds(bounds: KakaoLatLngBounds): void;
  setCenter(latlng: KakaoLatLng): void;
}

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: { position: KakaoLatLng; map: KakaoMap }) => unknown;
  event: {
    addListener: (target: unknown, type: string, handler: () => void) => void;
  };
}

declare global {
  interface Window {
    kakao: { maps: KakaoMapsNamespace };
  }
}

let loaderPromise: Promise<void> | null = null;

/** 카카오맵 SDK를 최초 1회만 동적 스크립트로 주입하고, 로드 완료 시 resolve한다. */
export function loadKakaoMapSdk(appKey: string): Promise<void> {
  if (window.kakao?.maps) {
    return Promise.resolve();
  }
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("카카오맵 SDK 로드 실패"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
