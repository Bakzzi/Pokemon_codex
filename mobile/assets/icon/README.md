# 안드로이드 앱 아이콘

게임에 이미 사용 중인 몬스터볼 도트를 확대해 사용한다. 작은 도트의 색과 윤곽을 그대로 유지하고 기존 게임 화면과 같은 짙은 녹색 배경을 둔다. 텍스트나 추가 장식은 넣지 않는다.

![아이콘 미리보기](ic_launcher_preview.png)

- 원본: `desktop/assets/items/poke-ball.png`. PokeAPI의 고정된 스프라이트이며 새로 그리거나 AI로 생성한 이미지가 아니다.
- 출처와 해시: [source.json](source.json), 저장소의 `THIRD_PARTY_NOTICES.md`.
- 재생성: 저장소 루트에서 `powershell -NoProfile -File mobile/scripts/build-icons.ps1`.
- Android 리소스: `mobile/android/app/src/main/res`의 `ic_launcher` 계열. 컬러 전경·배경, 테마용 단색 전경, 밀도별 PNG를 포함한다.
- 앱을 연결할 때 매니페스트에 `android:icon="@mipmap/ic_launcher"`를 지정한다. 별도 원형 아이콘이 필요하면 같은 리소스를 `android:roundIcon`에 지정할 수 있다.

아이콘 리소스 준비를 마친 상태다. 아직 안드로이드 앱 본체나 설치 APK를 만든 상태는 아니다.
