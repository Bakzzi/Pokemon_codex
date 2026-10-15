# Pokémon Codex Buddy

코딩하는 동안 포켓몬을 만나고, 잡고, 키우는 작은 Windows 데스크톱 게임입니다. 작업에 집중한 뒤 포켓기어와 모험 기록에서 동료들의 모험을 돌아볼 수 있습니다.

**원작 모모찡 · momozzing** — [Digimon_mod](https://github.com/momozzing/Digimon_mod)에서 출발한 비영리 팬 프로젝트입니다. 원작의 MIT 라이선스와 표기를 유지합니다.

**[Windows 실행 파일 받기 · 최신 릴리스](https://github.com/Bakzzi/Pokemon_codex/releases/latest)**

릴리스의 portable ZIP을 받아 압축을 풀고 **PokemonCodex.exe**를 실행하세요. 폴더 안의 파일을 함께 유지하면 됩니다. 포터블 실행에는 Node.js가 필요 없습니다. GitHub의 Source code ZIP은 실행 파일 배포본과 다릅니다.

<p align="center">
  <img src="docs/screenshots/widget.png" width="300" alt="코딩과 함께하는 포켓몬 위젯 화면">
  <img src="docs/screenshots/collection.png" width="488" alt="만난 포켓몬과 잡은 포켓몬을 살펴보는 도감 화면">
</p>

## 사용하기

- Codex에서 작업하면 위젯이 로컬 작업 상태와 사용량을 읽어 모험을 진행합니다. API 키나 hooks를 따로 설정하지 않습니다.
- 상단이나 배틀 배경을 드래그해 이동합니다. ⌖는 항상 위에, ▱는 작게 보기, −는 트레이로 숨기기, ×는 종료입니다.
- 작게 보기에서는 남은 사용 한도를 확인할 수 있습니다. 기록에서 한도를 제공하지 않으면 미제공으로 표시합니다.
- **포켓기어**에서 도감과 동료를 확인하고, 최대 여섯 개의 선택 칸에 배치합니다. 빈칸을 모두 채울 필요는 없습니다.
- **도전하기**, **가방보기**, **모험 기록**에서 진행 중인 모험과 보유 물품, 지난 결과를 확인합니다.
- 배틀과 교체는 자동으로 진행됩니다. 진행 중에 요청한 행동은 화면에 표시되는 대기 조건을 충족하면 실행하며, 예약 목록에서 취소할 수 있습니다.
- 새로운 만남과 진행 요소는 모험 속에서 직접 발견해 보세요. 선택에 따른 중요한 변경 사항은 실행 전에 게임 화면에서 안내합니다.

## 저장과 월간 시즌

진행과 창 설정은 **%APPDATA%\PokemonCodexBuddy\progress.json**에 저장합니다. 업데이트할 때는 기존 위젯을 종료한 뒤 새 폴더의 실행 파일을 실행하세요. 진행 파일과 백업은 배포 폴더와 별개이므로 삭제하지 마세요.

**한국시간 매월 1일 00:00에 새 시즌이 시작됩니다.** 진행 중인 배틀과 결과 연출이 끝난 뒤 적용하며, 꺼 둔 경우 다음 실행 때 적용합니다. 보유 개체와 레벨, 뱃지, 모험 진행, 물품 등 시즌 기록은 새로 시작하고, **누적 도감 기록과 도감 경험치 부스터, Codex 읽기 기준과 창 설정은 유지**합니다. 초기화 직전 진행 파일은 자동으로 백업합니다.

손상된 저장은 사본을 보존한 뒤 실행을 중단합니다. 새 버전의 저장을 이전 버전으로 열지 마세요. 복구가 필요하면 위젯을 종료하고 해당 버전의 백업을 사용하세요.

## Codex 연동과 개인정보

- 로컬 Codex 기록을 읽기 전용으로 관측합니다. 작업 상태와 숫자 토큰·한도 필드만 사용합니다.
- 대화 본문, 도구 인자, 인증정보와 계정 잔액은 저장하거나 전송하지 않습니다.
- 실행 중 Codex 명령 실행이나 세션 입력, 외부 서버 통신을 하지 않습니다. 게임 데이터와 그림은 로컬 파일로 불러옵니다.
- 로컬 기록에 나타나지 않는 클라우드 작업이나 사용 한도는 반영하지 못합니다.

## 소스 실행과 개발

Node.js 22.12 이상을 권장합니다. 처음에는 **Setup.cmd**, 이후 **Start Pokemon.vbs**로 실행할 수 있습니다. 의존성 버전은 package-lock.json에 고정되어 있습니다.

~~~powershell
npm.cmd ci
node --experimental-require-module node_modules/electron/install.js
npm.cmd test
npm.cmd run smoke
npm.cmd run package
~~~

검증에는 실제 Codex 세션이나 사용자 진행 기록을 사용하지 않습니다. 배포 식별자·소스 커밋·검증 결과·파일 해시는 docs/releases/에 기록합니다.

## 출처

- **[모모찡 / Digimon_mod](https://github.com/momozzing/Digimon_mod)** — MIT, Copyright (c) 2026 momozzing. 원본 설명서는 docs/UPSTREAM_README.md에 보관합니다.
- [PokeAPI](https://pokeapi.co/) — 포켓몬 데이터와 스프라이트. 고정된 원본 자료와 출처·해시는 reference/pokeapi/ 및 desktop/assets/에 보관합니다.
- [Pokémon Showdown / @pkmn/sim](https://github.com/pkmn/ps/tree/main/sim) — 로컬 전투 계산. 고정 버전과 라이선스를 배포본에 포함합니다.
- 외부 데이터·그림·참고 자료의 상세 출처와 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 기록합니다.

포켓몬 명칭·캐릭터·게임 그림의 권리는 해당 권리자에게 있습니다. 코드의 MIT 라이선스가 포켓몬 자산에 적용되는 것은 아닙니다. Nintendo, Creatures, GAME FREAK, The Pokémon Company 또는 OpenAI의 공식·승인 프로젝트가 아닙니다.
