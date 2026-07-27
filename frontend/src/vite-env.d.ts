/// <reference types="vite/client" />

// Vite는 VITE_ 접두어 env를 import.meta.env로 노출한다. 커스텀 키는 여기서 타입을 보강해야
// 다른 파일에서 import.meta.env.VITE_* 접근 시 타입 체크가 된다.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_KAKAO_MAP_APP_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
