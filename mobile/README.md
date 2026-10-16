# 포켓몬 작은 모험 · Android

화면을 켜 두면 동료들이 자동으로 모험하고, 앱을 꺼 둔 동안에는 걸은 만큼 모험하는 비공식 비영리 팬 게임입니다. 원작 **모모찡 · momozzing**의 [Digimon_mod](https://github.com/momozzing/Digimon_mod)에서 출발했습니다. 기존 Windows 앱과 별개로 저장됩니다.

## 설치와 사용

Android 12 이상에서 [Android 배포본](https://github.com/Bakzzi/Pokemon_codex/releases/tag/android-v0.1.1)의 APK를 설치하세요. 첫 실행에는 피카츄와 함께 시작합니다. **포켓기어 · 도전하기 · 가방보기 · 모험 기록**에서 동료와 진행을 확인하세요.

- 게임 화면이 열려 있으면 기존 배틀 연출 속도로 자동 모험합니다. 다른 앱으로 전환하거나 화면을 잠그면 멈춥니다.
- **설정 → 걸음 기록 켜기**에서 신체 활동 권한을 허용하세요. 걸음 기록 알림을 유지하는 서비스가 사용됩니다. 꺼 둔 동안의 **10걸음당 모험 행동 1회**를 돌아왔을 때 처리합니다. 이미 반영한 걸음은 다시 지급하지 않습니다.
- 걸음 센서가 없거나 권한이 없으면 켜 둔 모험만 사용할 수 있습니다. 강제 종료, 권한 해제, 제조사 절전 제한으로 기록되지 않은 걸음은 추정하지 않습니다. 걷지 않은 대기 시간에는 보상이 없습니다.
- 다른 앱 사용 시간이나 AI 토큰을 읽지 않습니다. 걸음 기록과 진행은 기기 안에 저장합니다. 앱 삭제 시 로컬 진행도 삭제되므로 업데이트할 때 앱을 먼저 지우지 마세요.
- **설정 → 앱 업데이트 설치 허용**은 처음 한 번 설정합니다. 이후 새 버전을 자동 확인·다운로드하고, 배틀을 마친 뒤 저장하고 설치합니다. 기기에서 추가 승인을 요구하면 설정에 시스템 설치 화면 버튼이 표시됩니다.
- Android 채널은 Windows의 `latest` 릴리스와 분리되어 있습니다. 화면·저장·진행은 Android 14 에뮬레이터에서 확인했습니다. 에뮬레이터의 앱 검증기가 자체 업데이트를 거부하여 무인 설치 완료는 검증하지 못했습니다. 거부 후 기존 앱과 저장 보존을 확인했으며, 실제 걸음 기록과 기기별 설치 동작은 실기기 확인이 필요합니다.

월간 시즌과 누적 도감은 기존 게임 규칙을 유지합니다. 새로운 만남과 진행 요소는 모험 속에서 직접 발견해 보세요.

## 개발과 검증

필요 환경: Node.js **22.11.0**, JDK **17 이상** (현재 Android Studio JBR 사용), Android SDK **36**, Build Tools **36.1.0**. Gradle **8.13**의 wrapper와 배포 SHA-256, Android Gradle Plugin **8.13.0**, npm 잠금 파일을 소스에 고정합니다.

```powershell
npm.cmd ci
npm.cmd run mobile:build
npm.cmd run mobile:test
# APK 빌드와 Android lint 포함
powershell -NoProfile -ExecutionPolicy Bypass -File mobile/scripts/verify-android.ps1 -WithBuild
```

첫 release 빌드는 `%LOCALAPPDATA%/PokemonIdleSigning/pokemon-idle-release.jks`와 Git에서 제외된 `mobile/android/keystore.properties`를 생성합니다. **둘 다 안전하게 보관하세요.** 키를 잃으면 같은 앱을 업데이트할 수 없습니다. 다른 PC에서는 기존 키와 설정을 복원해야 합니다. 키·비밀번호를 Git이나 릴리스에 올리지 마세요. 디버그 APK는 `build-android.ps1 -DebugBuild`로 별도 앱 ID를 사용합니다.

결과는 `mobile/android/app/build/outputs/apk/release/app-release.apk`입니다. 검증된 배포본은 `dist/android/<version>/`에 APK·체크섬·릴리스 식별 정보를 함께 보관합니다. Windows 배포본과 사용자 데이터는 건드리지 않습니다.

`build-web.cjs`는 잠긴 의존성과 기존 게임 코드를 브라우저용 CommonJS 묶음으로 만듭니다. 전투 엔진을 새로 작성하지 않으며 Node.js/Electron 실행 환경이나 SSH 기능은 APK에 포함하지 않습니다. Android WebView는 앱 안의 고정 HTTPS 출처에서 패키지 리소스만 열며 외부 페이지·파일 접근을 차단합니다.

걸음 센서의 누적 값, 부팅 식별자, 화면 상태를 로컬 장부로 관리합니다. 화면 전환을 가로질러 뒤늦게 들어온 모호한 표본은 보수적으로 제외합니다. 반영한 걸음의 커서와 게임 진행은 한 AtomicFile로 함께 저장합니다. 센서 장부는 재부팅 시 기준만 새로 잡고 누적 보상 수는 유지합니다.

계측 검사는 별도 `androidTest` APK의 `MobileTest`로 실행합니다. 게임 화면·도감·가방·뱃지·실제 Activity 백그라운드 정지·걸음 fixture의 단일 반영·저장 거부·업데이트 무결성 거부를 확인합니다. `mode=update`는 같은 서명의 상위 APK가 든 test asset으로 설치 세션을 제출하며, 제출 성공은 설치 완료를 뜻하지 않습니다. 외부에서 실제 설치 버전 코드를 확인한 뒤 `mode=preserved`로 진행 보존을 확인해야 합니다. 센서 fixture 통과는 실기기 보행 검증을 뜻하지 않습니다.

업데이트 정보는 `mobile/updates/android.json`에서 읽습니다. APK 크기·SHA-256·앱 ID·상위 버전 코드·현재 설치된 서명과의 일치를 검증한 후 Android PackageInstaller로 자기 자신을 교체합니다. 공개된 APK는 바꾸지 않고 새 버전 코드를 발급합니다. Android 릴리스에는 `--latest=false`를 지정하여 Windows 업데이트 채널을 유지하세요.

코드는 [MIT](../LICENSE)이며 Pokémon 이미지와 상표의 권리는 해당 권리자에게 있습니다. 전투 엔진과 묶인 의존성의 라이선스 고지를 APK에 포함합니다.
