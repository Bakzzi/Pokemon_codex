# PokéAPI 참고 자료

포켓몬 코덱스 위젯의 데이터 출처와 재현을 위한 오프라인 자료다. `desktop/scripts/build-data.cjs`가 이 자료에서 필요한 값을 추려 `desktop/data/game-data.json`을 만든다. 실행 중인 위젯은 압축된 런타임 자료를 읽으며, 이 폴더 전체는 실행 파일 ZIP에 포함하지 않는다.

1세대 151종과 해금용 2세대 100종을 분리했다. 현재 게임에서는 관동 챔피언이 된 뒤에만 피츄를 포함한 2세대가 열린다. 실제 게임 규칙은 [프로젝트 설명서](../../README.md)를 기준으로 한다.

## 들어 있는 자료

| 파일 | 내용 |
| --- | --- |
| [pokemon-kanto.json](data/pokemon-kanto.json) | No.1–151: 한국어 이름·분류·도감 설명, 포획률, 성장 그룹, 진화 관계, 능력치·타입·특성의 현재값과 변경 이력 |
| [pokemon-johto-future.json](data/pokemon-johto-future.json) | No.152–251: 이후 2세대 해금을 위한 별도 자료 |
| [moves-generation-2-3.json](data/moves-generation-2-3.json) | 3세대까지 도입된 본편 기술 354개: 한국어 이름·설명, 위력·명중·PP·타입·효과 및 수치 변경 이력 |
| [learnsets-generation-2-3.json](data/learnsets-generation-2-3.json) | 251종의 버전별 기술 습득 기록 50,041개. 레벨업·기술머신·교배·가르침 등 습득 방법을 구분 |
| [evolution-rules.json](data/evolution-rules.json) | 진화 조건 원본 149개와 관련 도구: 레벨·돌·교환·친밀도·시간 등. 버전별 대안을 보존 |
| [growth-and-experience.json](data/growth-and-experience.json) | 성장 그룹 6종, 레벨 1–100의 누적 경험치 600개 |
| [types-and-matchups.json](data/types-and-matchups.json) | 2·3세대에 존재하는 타입과 상성의 현재값·과거 변경값 |
| [encounters-generation-2-3.json](data/encounters-generation-2-3.json) | 버전·지역·조우 방법·조건·레벨별 출현 슬롯 15,044개 |
| [sprites-generation-2-3.json](data/sprites-generation-2-3.json) | 크리스탈 및 파이어레드·리프그린의 앞·뒷모습 원본 주소 |
| [reference-lookups.json](data/reference-lookups.json) | 능력치·서식지·특성·상태이상 등 참조 ID의 이름 |
| [manifest.json](manifest.json) | 원본 56개 파일의 주소·수집 시각·크기·SHA-256 및 데이터 저장소 커밋 |
| [validation.json](validation.json) | 도감 범위·한국어 이름·기술 참조·성장 표·원본 해시 등 검증 결과 |
| [verification.json](verification.json) | 저장 파일 전체 해시와 151종 도트 누락 검사, 공식 API/CSV 기술 습득표 교차 확인 |
| [sprite-manifest.json](sprite-manifest.json) | 별도로 보관한 도트 이미지의 원본 주소·규격·SHA-256 |

기술 습득·출현 표의 대상 버전은 금·은·크리스탈·루비·사파이어·에메랄드·파이어레드·리프그린이다. 버전을 섞어 하나의 기술 목록이나 확률로 합치지 않았다. 원본 CSV에는 다른 세대와 콘솔 게임 자료도 보존되어 있으나, 정리한 습득·출현 표에는 포함하지 않았다.

## 데이터를 적용할 때 구분할 점

- `captureRate`는 포획 계산에 넣는 고유 수치다. 등장 확률이나 포획 성공 백분율이 아니다.
- 원작 출현 확률은 특정 지역·방법·조건에서 해당 슬롯이 선택되는 확률이다. 시간대 등 서로 다른 조건의 슬롯을 합산하면 안 된다. 1세대 중 이 범위의 출현 기록이 있는 종은 121종이다. 기록이 없는 종을 우리 게임에서 출현 확률 0으로 처리하면 안 된다.
- 전설·환상 포켓몬을 포함한 우리 게임의 전체 출현 확률, 미포획 보정, 세대 해금 조건은 이 자료에서 계산하거나 결정하지 않았다.
- `latestReference`, `latestMetadata` 등은 PokéAPI의 현재 기준값이다. 2·3세대 전투에 쓰려면 `historicalOverrides`/`historicalChanges`와 적용 버전을 확인해야 한다. 예를 들어 옛 타입과 기술 위력을 현재값으로 덮어 쓰면 안 된다.
- 진화 표에는 버전과 폼 조건이 섞여 있다. 실제 구현에서 버전·일반 폼·해금된 종으로 좁혀야 한다. 피카츄의 원본 선행 진화 정보에 피츄가 있더라도, 1세대만 개방된 동안 피츄를 자동 추가하면 안 된다.
- 현재 게임은 진화로 얻은 종도 도감 수집 완료로 인정하며, 돌·교환 진화 조건을 별도 게임 로직에서 처리한다.
- API는 능력치와 데이터의 출처다. 자동 배틀, 포획 판정 실행, 기술별 화면 효과, 코딩 작업량과 경험치의 연결은 별도 게임 로직이 필요하다.

## 도트 보관

No.1–151에 대해 크리스탈의 움직이는 앞모습·투명 배경 뒷모습, 파이어레드·리프그린의 앞모습·뒷모습을 각각 `sprites/`에 보관한다. 총 604개이며, 원본을 변형하지 않는다. 2세대 100종의 이미지 주소도 준비되어 있지만 해당 이미지는 아직 일괄 다운로드하지 않았다.

## 출처와 재현

- 서비스 및 문서: <https://pokeapi.co/> · <https://pokeapi.co/docs/v2/>
- 공식 데이터 저장소: <https://github.com/PokeAPI/pokeapi>
- 고정한 데이터 커밋: `81d20919845b6a445969b9265aab5cec6b04cece`
- 공식 도트 저장소: <https://github.com/PokeAPI/sprites>
- 원본 라이선스: [UPSTREAM-LICENSE](raw/UPSTREAM-LICENSE)

PokéAPI가 권장하는 로컬 캐시 방식으로 보관했다. CSV는 같은 커밋에서 받아 수집 도중 버전이 섞이지 않도록 했고, 재실행 시 이미 받은 파일은 해시를 확인하여 재사용한다. 도트는 API가 제공한 원본 주소와 파일 해시를 함께 기록한다.

저장소 루트에서 실행:

```powershell
node reference/pokeapi/download.cjs
node reference/pokeapi/prepare.cjs
node reference/pokeapi/download-sprites.cjs
node reference/pokeapi/verify.cjs
```

이 명령은 `reference/pokeapi/`만 기록한다. 실행 중인 위젯에 적용하거나 세이브 파일을 변경하지 않는다.
