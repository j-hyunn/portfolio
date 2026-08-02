![[Pasted image 20260225175511.png]]
## 1. 계층 구조

백엔드 데이터 모델은 4단계 계층으로 구성된다.

```
Area (구역 대분류)
 └─ Section (석 종류)
      └─ Block (블록 번호)
           └─ Seat (열 × 좌석)
```

---

## 2. Area — 구역 대분류 (4개)

|AreaCode|명칭|설명|
|---|---|---|
|`HOME`|1루(홈)|홈팀 응원석 포함, 1루 내야 전체|
|`AWAY`|3루(어웨이)|원정팀 응원석 포함, 3루 내야 전체|
|`OUTFIELD`|외야|외야 그린석 전체|
|`CENTER`|중앙|중앙 프리미엄석(테라존)|

---

## 3. Section — 석 종류 (8종)

|SectionCode|명칭|소속 Area|
|---|---|---|
|`PREMIUM`|테라존(중앙 프리미엄석)|CENTER|
|`PURPLE`|퍼플석(테이블석)|HOME, AWAY|
|`EXCITING`|익사이팅존|HOME, AWAY|
|`BLUE`|블루석|HOME, AWAY|
|`ORANGE`|오렌지석 (응원석)|HOME, AWAY|
|`RED`|레드석|HOME, AWAY|
|`NAVY`|네이비석|HOME, AWAY|
|`GREEN`|그린석(외야석)|OUTFIELD|

---

## 4. Viewpoint — 블록별 시야 구분 (6종)

추천 점수 계산 및 온보딩 구역 선호 수집에 사용되는 블록 레벨 속성이다.

|Viewpoint|한국어|해당 블록|
|---|---|---|
|`CENTER`|중앙|CP (테라존)|
|`INFIELD_1B`|1루 내야|EX-1, 홈 오렌지/퍼플/블루/레드/네이비석 전체|
|`INFIELD_3B`|3루 내야|EX-3, 어웨이 오렌지/퍼플/블루/레드/네이비석 전체|
|`OUTFIELD_R`|외야(우) — 1루 방향|401~407|
|`OUTFIELD_C`|외야(중앙)|408~415|
|`OUTFIELD_L`|외야(좌) — 3루 방향|416~422|

> 온보딩 Q1("어디에서 보고 싶으신가요?")의 선택지는 이 Viewpoint enum을 기준으로 구성된다.

---

## 5. 블록 전체 목록

### 5.1 중앙 (CENTER)

|blockNum|blockCode|Section|Viewpoint|비고|
|---|---|---|---|---|
|1|CP|테라존|CENTER|중앙 프리미엄석|

---

### 5.2 익사이팅존

|blockNum|blockCode|Area|Section|Viewpoint|비고|
|---|---|---|---|---|---|
|2|EX-1|HOME|익사이팅존|INFIELD_1B|1루 익사이팅|
|3|EX-3|AWAY|익사이팅존|INFIELD_3B|3루 익사이팅|

---

### 5.3 오렌지석 — 응원석

> homeCheerRank 1~4 = 홈 응원석 최우선 블록 awayCheerRank 1~4 = 원정 응원석 최우선 블록

|blockNum|blockCode|Area|Section|Viewpoint|homeCheerRank|awayCheerRank|
|---|---|---|---|---|---|---|
|205|205|HOME|오렌지석|INFIELD_1B|**1**|80|
|206|206|HOME|오렌지석|INFIELD_1B|**2**|81|
|207|207|HOME|오렌지석|INFIELD_1B|**3**|82|
|208|208|HOME|오렌지석|INFIELD_1B|**4**|83|
|219|219|AWAY|오렌지석|INFIELD_3B|80|**1**|
|220|220|AWAY|오렌지석|INFIELD_3B|81|**2**|
|221|221|AWAY|오렌지석|INFIELD_3B|82|**3**|
|222|222|AWAY|오렌지석|INFIELD_3B|83|**4**|

---

### 5.4 퍼플석 (테이블석)

|blockNum|blockCode|Area|Section|Viewpoint|homeCheerRank|awayCheerRank|
|---|---|---|---|---|---|---|
|110|110|HOME|퍼플석|INFIELD_1B|10|60|
|111|111|HOME|퍼플석|INFIELD_1B|11|61|
|112|112|HOME|퍼플석|INFIELD_1B|12|62|
|113|113|HOME|퍼플석|INFIELD_1B|13|63|
|212|212|AWAY|퍼플석|INFIELD_3B|60|10|
|213|213|AWAY|퍼플석|INFIELD_3B|61|11|
|214|214|AWAY|퍼플석|INFIELD_3B|62|12|
|215|215|AWAY|퍼플석|INFIELD_3B|63|13|

---

### 5.5 블루석

|blockNum|blockCode|Area|Section|Viewpoint|층|homeCheerRank|awayCheerRank|
|---|---|---|---|---|---|---|---|
|107|107|AWAY|블루석|INFIELD_3B|1층|55|14|
|108|108|AWAY|블루석|INFIELD_3B|1층|56|15|
|109|109|AWAY|블루석|INFIELD_3B|1층|57|16|
|114|114|HOME|블루석|INFIELD_1B|1층|14|55|
|115|115|HOME|블루석|INFIELD_1B|1층|15|56|
|116|116|HOME|블루석|INFIELD_1B|1층|16|57|
|209|209|AWAY|블루석|INFIELD_3B|2층|70|5|
|210|210|AWAY|블루석|INFIELD_3B|2층|71|6|
|211|211|AWAY|블루석|INFIELD_3B|2층|72|7|
|216|216|HOME|블루석|INFIELD_1B|2층|5|70|
|217|217|HOME|블루석|INFIELD_1B|2층|6|71|
|218|218|HOME|블루석|INFIELD_1B|2층|7|72|

---

### 5.6 레드석

|blockNum|blockCode|Area|Section|Viewpoint|층|homeCheerRank|awayCheerRank|
|---|---|---|---|---|---|---|---|
|101|101|AWAY|레드석|INFIELD_3B|1층|45|17|
|102|102|AWAY|레드석|INFIELD_3B|1층|46|18|
|103|103|AWAY|레드석|INFIELD_3B|1층|47|19|
|104|104|AWAY|레드석|INFIELD_3B|1층|48|20|
|105|105|AWAY|레드석|INFIELD_3B|1층|49|21|
|106|106|AWAY|레드석|INFIELD_3B|1층|50|22|
|117|117|HOME|레드석|INFIELD_1B|1층|17|45|
|118|118|HOME|레드석|INFIELD_1B|1층|18|46|
|119|119|HOME|레드석|INFIELD_1B|1층|19|47|
|120|120|HOME|레드석|INFIELD_1B|1층|20|48|
|121|121|HOME|레드석|INFIELD_1B|1층|21|49|
|122|122|HOME|레드석|INFIELD_1B|1층|22|50|
|201|201|AWAY|레드석|INFIELD_3B|2층|65|8|
|202|202|AWAY|레드석|INFIELD_3B|2층|66|9|
|203|203|AWAY|레드석|INFIELD_3B|2층|67|10|
|204|204|AWAY|레드석|INFIELD_3B|2층|68|11|
|223|223|HOME|레드석|INFIELD_1B|2층|8|65|
|224|224|HOME|레드석|INFIELD_1B|2층|9|66|
|225|225|HOME|레드석|INFIELD_1B|2층|10|67|
|226|226|HOME|레드석|INFIELD_1B|2층|11|68|

---

### 5.7 네이비석

|blockNum 범위|Area|Section|Viewpoint|homeCheerRank 범위|awayCheerRank 범위|
|---|---|---|---|---|---|
|301~317 (17개)|HOME|네이비석|INFIELD_1B|23~39|35~51|
|318~334 (17개)|AWAY|네이비석|INFIELD_3B|35~51|23~39|

---

### 5.8 외야 그린석

|blockNum 범위|Area|Section|Viewpoint|방향|
|---|---|---|---|---|
|401~407 (7개)|OUTFIELD|그린석|OUTFIELD_R|1루 방향(우익수 쪽)|
|408~415 (8개)|OUTFIELD|그린석|OUTFIELD_C|중앙(중견수 쪽)|
|416~422 (7개)|OUTFIELD|그린석|OUTFIELD_L|3루 방향(좌익수 쪽)|

---

## 6. 블록 요약 통계

|구분|블록 수|
|---|---|
|중앙 프리미엄 (CP)|1|
|익사이팅존|2|
|오렌지석 (응원석)|8|
|퍼플석|8|
|블루석|12|
|레드석|20|
|네이비석|34|
|외야 그린석|22|
|**합계**|**107**|

---

## 7. 블록 내 좌석 구조 (STANDARD 레이아웃)

모든 블록은 동일한 `STANDARD` 레이아웃을 사용한다. 총 **22행, 블록당 최대 280석**이다.

|행(row)|좌석 수|templateColNo 시작|SeatZone|
|---|---|---|---|
|1~3행|14석|1|**LOW (하단)**|
|4~7행|7석|5|**MID (중단)**|
|8~22행|14석|1|**HIGH (상단)**|

> `templateColNo`는 행 내에서 좌석의 절대 위치를 나타내는 렌더링용 컬럼 인덱스다. 4~7행(MID)의 시작 컬럼이 5인 이유는 14칸 그리드 기준으로 중앙에 7석을 배치하기 위함이다.

---

## 8. 응원석 기준

`homeCheerRank` / `awayCheerRank` 값이 낮을수록 해당 팀 응원석에 가까운 블록이다.

|구분|홈팀 응원석 핵심 블록|원정팀 응원석 핵심 블록|
|---|---|---|
|rank 1~4|**205~208** (1루 오렌지석)|**219~222** (3루 오렌지석)|
|rank 5~13|216~218 (블루 2층), 223~226 (레드 2층)|209~211 (블루 2층), 201~204 (레드 2층)|
|rank 14~22|114~116 (블루 1층), 117~122 (레드 1층)|107~109 (블루 1층), 101~106 (레드 1층)|

> 온보딩 Q2("응원하는 구단"), Q3("응원석 근방 선호")는 이 rank 값을 기준으로 내블럭 우선순위를 산출한다. 자세한 점수 계산 방식은 [[추천블럭 계산 가이드]] 참조.

---

## 9. 1루/3루 Area 경계 기준

|Area|포함 블록 범위|기준|
|---|---|---|
|**HOME (1루)**|EX-1, 110~122, 205~208, 216~226, 301~317|`AreaCode.HOME`|
|**AWAY (3루)**|EX-3, 101~109, 201~215, 219~222, 318~334|`AreaCode.AWAY`|
|**OUTFIELD (외야)**|401~422|`AreaCode.OUTFIELD`|
|**CENTER (중앙)**|CP (블록 1번)|`AreaCode.CENTER`|

> 1루/3루 구분은 경기장 물리적 베이스 위치를 기준으로 하며, 홈팀 덕아웃이 1루 쪽(HOME)이다.

---

## 관련 문서

- [[온보딩]] — Q1(Viewpoint), Q2(응원 구단), Q3(응원석 거리) 선호 데이터 수집
- [[추천블럭 계산 가이드]] — homeCheerRank/awayCheerRank 기반 점수 계산
- [[티켓 예매]] — blockNum 기반 블록 카드 표시 및 Hold 요청
