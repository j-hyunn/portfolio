> 작성 기준: 백엔드 코드 분석 + Staging 인프라 스펙 + 실제 티켓팅 서비스 레퍼런스  
> 목적: 현재 인프라 한계 측정 → 결과 기반 풀스케일 예측

---

## 1부. 현재 인프라 기준 테스트 (3,000석 규모)

### 1.1 규모 축소 배경

플레이볼 목표 규모는 15,000석이나, 현재 Staging 인프라의 실질 처리 한계를 고려하여 테스트 규모를 3,000석으로 축소한다.

**현재 Staging 인프라 스펙**

|항목|스펙|실질 한계|
|---|---|---|
|seat|2 replica, CPU 500m|100 TPS (Lock 경합 기준)|
|order-core|1 replica, CPU 500m|25~50 TPS (DB write 기준)|
|queue|2 replica, CPU 500m|100 TPS 통과 하드리밋|
|RDS|db.t4g.micro|커넥션 최대 85개, 여유 25개|
|Redis|cache.t4g.micro|단일 클러스터|
|HPA|없음|파드 수 고정|

**규모 축소 근거**

```
15,000석 기준 Hold TPS 목표:  500 TPS  → 현재 인프라 처리 불가
3,000석 기준 Hold TPS 목표:  100 TPS  → 현재 인프라 한계 구간
                             25 TPS   → order-core 안정 처리 구간

3,000석은 현재 인프라가 병목을 명확히 측정할 수 있는 최대 규모
```

### 1.2 3,000석 기준 수요 산정

|항목|수치|근거|
|---|---|---|
|경기장 좌석 수|3,000석|인프라 기준 역산|
|예상 접속 시도|9,000명|좌석 수 × 3배|
|대기열 통과 TPS|**100명/초**|promotion-batch-size 하드리밋 (코드 확인)|
|Hold 요청 TPS|**100 TPS**|queue 통과 상한|
|주문 생성 TPS|**25~50 TPS**|order-core 한계|
|대기 중 폴링 RPS|**약 1,800 RPS**|9,000명 × 폴링 간격 기반 추산|

### 1.3 코드 기반 확인된 핵심 동작

```
[SeatHoldLockManager]
WAIT_TIME  = 500ms  → 동일 좌석 경합 시 500ms 후 즉시 실패
LEASE_TIME = 5s     → Watchdog 비활성 (명시적 LEASE 설정)

[SeatHoldTransactionalService]
HOLD_TTL = 5분
Hold 1건 = DB 쿼리 최소 4회

[QueueService]
promotion-batch-size:  100명/회
promotion-interval-ms: 1,000ms
→ 초당 100명 통과 하드리밋
→ queue.enter()에서 matchRepository DB 조회 발생
→ spike 시 RDS 동반 부하 (사전 가정과 다른 점)

[OrderService]
idempotencyKey 미구현 (코드 확인)
주문 1건 = DB 쿼리 6 + (좌석 수 × 2)회
```

### 1.4 테스트 시나리오

#### Phase 1. 대기열 Spike + 폴링 부하

|항목|내용|
|---|---|
|대상 서비스|queue + RDS|
|주입|9,000명 동시 진입 (10초 내 spike)|

**액션 및 호출 API**

```
액션 1-1. 대기열 진입
  POST /matches/{matchId}/enter
  → 9,000명 동시 spike
  → ⚠️ 내부에서 matchRepository DB 조회 발생 → RDS 동반 부하

액션 1-2. 대기열 상태 폴링 (동시 진행)
  GET /matches/{matchId}/status
  → 순위 기반 동적 간격:
      상위 100명:   1,500ms마다
      100~1,000명:  3,000ms마다
      1,000명 이후: 5,000ms마다
  → 추산 폴링 RPS: 약 1,800 RPS
```

**측정 지표**

```
- 대기열 진입 에러율 1% 미만
- 대기열 진입 p95 < 1초
- 폴링 p95 < 1초
- RDS 커넥션 소진 시점 (여유 25개 기준)
```

---

#### Phase 2. Hold TPS 테스트 (추천 ON/OFF 비교) ← 핵심

|항목|내용|
|---|---|
|대상 서비스|seat (2 replica)|
|주입|100 TPS (queue 하드리밋)|

**시나리오 A — 추천 OFF (맵 모드)**

```
액션 순서:
  1. GET /matches/{matchId}/seat-groups
     → 맵 모드 초기 데이터 로딩

  2. GET /matches/{matchId}/sections/{sectionId}/blocks
     → 핫스팟 섹션 집중 조회

  3. POST /matches/{matchId}/seat-holds
     Body: { seatIds: [...] }
     → 동일 블록 2~3개 집중
     → Lock WAIT 500ms → 대부분 실패

측정 지표:
- Hold 성공률 (베이스라인)
- SEAT_LOCK_ACQUISITION_FAILED 건수
- p95 응답시간
```

**시나리오 B — 추천 ON**

```
액션 순서:
  1. GET /matches/{matchId}/recommendations/seat-entry
     → 추천 모드 초기 데이터

  2. GET /matches/{matchId}/recommendations/blocks
     → 내블럭 기반 분산 후보 반환

  3. POST /matches/{matchId}/recommendations/blocks/{blockId}/assign
     → 블록별 분산 요청
     → Lock 경합 자체 감소

측정 지표:
- Hold 성공률 (시나리오 A 대비 향상폭 ← 발표 핵심 수치)
- SEAT_LOCK_ACQUISITION_FAILED 건수 (A 대비 감소량)
- p95 응답시간
```

---

#### Phase 3. 주문 생성 집중 테스트

|항목|내용|
|---|---|
|대상 서비스|order-core (1 replica) + RDS|
|주입|25~50 TPS|

```
액션 순서:
  1. GET /mypage/orders/sheet?matchId={id}&seatIds={ids}
     → Hold 유효성 검증 + 경기/좌석 정보 조합
     → DB 쿼리: match + seatHoldInfo (READ)

  2. POST /mypage/orders
     Body: { matchId, seats: [...], ordererName, ... }
     → DB 쿼리: 6 + (좌석 수 × 2)회
     → ⚠️ idempotencyKey 미구현 → 중복 요청 시 중복 주문 가능

  3. POST /mypage/orders/{orderId}/payment
     Body: { paymentMethod: "TOSS_PAY" | "KAKAO_PAY" | "BANK_TRANSFER" }

주입:
- 25~50 TPS 주문 생성
- 중복 요청 10% 추가 (idempotencyKey 미구현 검증)

측정 지표:
- 주문 생성 p95 / p99 응답시간
- RDS 커넥션 포화 시점 (85개 한계)
- 중복 orderId 생성 건수
```

---

#### Phase 4. End-to-End 복합 시나리오

```
타임라인 및 호출 API:

T+0초    POST /matches/{matchId}/enter          (9,000명 spike)
T+1초~   GET  /matches/{matchId}/status         (폴링 시작, ~1,800 RPS)
T+30초~  GET  /recommendations/seat-entry       (대기열 통과 시작)
         GET  /recommendations/blocks
         POST /recommendations/blocks/{id}/assign (100 TPS)
T+2분~   GET  /mypage/orders/sheet
         POST /mypage/orders                    (25~50 TPS)
         POST /mypage/orders/{id}/payment
T+5분    전 구간 동시 실행 유지

관찰 포인트:
- RDS 커넥션: T+0 spike에서 queue 진입이 먼저 소진하는지 여부
- seat: 100 TPS에서 추천 ON/OFF 성공률 차이
- order-core: 주문 집중 + 중복 요청 시 DB 과부하 시점
- Karpenter 노드 확장 트리거 여부
  (HPA 없으므로 노드 확장만으로는 파드 미증가)
```

---

### 1.5 통과 기준 (Pass/Fail)

| 항목                   | 목표         | 비고            |
| -------------------- | ---------- | ------------- |
| **Hold 성공률 (추천 ON)** | **70% 이상** | 핵심 KPI        |
| Hold 성공률 (추천 OFF)    | 측정 (비교 기준) | 플레이볼 가치 증명    |
| Hold 응답시간 p95        | **3초 이내**  | seat 기준       |
| 주문 생성 응답시간 p95       | **3초 이내**  | order-core 기준 |
| 대기열 진입 에러율           | **1% 미만**  | 5xx 기준        |
| 폴링 응답시간 p95          | **1초 이내**  | queue 기준      |

---

## 2부. 테스트 결과

> ⚠️ 이 섹션은 부하테스트 실행 후 채워야 할 항목

### 2.1 Phase 1. 대기열 결과

|지표|목표|실측값|
|---|---|---|
|대기열 진입 에러율|< 1%|—|
|대기열 진입 p95|< 1초|—|
|폴링 p95|< 1초|—|
|RDS 커넥션 최대치|—|—|
|병목 발생 시점|—|—|

### 2.2 Phase 2. Hold 성공률 비교 결과

| 지표         | 추천 OFF (A) | 추천 ON (B) | 향상폭 |
| ---------- | ---------- | --------- | --- |
| Hold 성공률   | —          | —         | —   |
| Lock 실패 건수 | —          | —         | —   |
| p95 응답시간   | —          | —         | —   |

### 2.3 Phase 3. Order-core 결과

|지표|목표|실측값|
|---|---|---|
|주문 생성 p95|< 3초|—|
|RDS 커넥션 포화 시점|—|—|
|중복 orderId 발생 건수|0건|—|

### 2.4 발견된 이슈

|이슈|내용|영향|
|---|---|---|
|Queue RDS 부하|queue.enter() 내 match DB 조회|spike 시 RDS 예상보다 빨리 소진|
|idempotencyKey 미구현|OrderService 중복 방어 없음|중복 주문 발생 가능|
|Order DB 쿼리 과다|주문 1건당 6+(좌석×2)회|고부하 시 RDS 커넥션 소진|
|HPA 미설정|파드 수 고정|노드 확장 무의미|

---

## 3부. 풀스케일(15,000석) 환경 예측

### 3.1 레퍼런스: KBO 티켓팅 서비스 기준 역산

#### 3.1.1 물리적 상한: 좌석 수 기반 최대 TPS 역산

KBO 주요 구장 좌석 수는 2만~2.5만석 수준이다. 이 물리적 상한을 기준으로 실제 시스템 처리량을 역산하면 다음과 같다.

```
25,000석 ÷ 600초 (10분 판매 완료 기준) ≈ 41 TPS
25,000석 ÷ 300초 (5분 판매 완료 기준) ≈ 83 TPS

여기에 실패 재시도 + 중복 클릭 + 결제 실패 트래픽 반영 시
→ 실제 시스템 처리량 ≈ 100~300 TPS
```

즉, 모든 좌석이 동시에 결제되는 구조가 아니기 때문에 티켓팅 시스템의 실질 TPS는 물리적으로 상한이 존재한다.

#### 3.1.2 PG(결제사) 병목 기준

```
국내 PG(토스페이먼츠, KG이니시스 등) 공통 제약:
- 카드 승인 1건 latency: 1~3초
- 안정적 처리량: 수백 TPS 수준

→ 시스템이 1,000 TPS를 처리 가능해도
  PG 단에서 병목이 발생하므로
  실질 결제 완료 TPS는 수백 TPS로 제한됨
```

#### 3.1.3 유사 서비스 CCU 간접 비교

```
글로벌:
- Ticketmaster: 수십만 CCU에서 장애 사례 공개, 대기열 필수 운영

국내:
- 인터파크 / 멜론티켓: 대형 콘서트 기준 수십만~100만 CCU 대응

KBO는 공연 대비 수요 10~20% 수준
→ KBO 티켓팅 기준 CCU: 약 10만~20만 레벨
```

#### 3.1.4 트래픽 구조 역산 (DAU → CCU)

```
KBO 인기 구단 기준 하루 예매 트래픽: 수만~수십만

DAU → 피크 CCU 전환율: 5~20% (일반적 경험치)
50,000 유입 → CCU: 2,500~10,000

피크 오픈 순간 10배 스파이크 가정:
→ 25,000~100,000 CCU
```

#### 3.1.5 실제 운영의 의도적 제한 (Throttle)

티켓팅 시스템의 최우선 목표는 좌석 중복 0건, 결제 실패 최소화다. 이를 위해 실제 운영에서는 이론 최대 TPS를 쓰지 않는다.

```
이론 최대: 500 TPS 가능
실제 운영: 100~300 TPS로 의도적 throttle
→ 항상 30~50% 수준으로 제한하여 운영
```

#### 3.1.6 레퍼런스 요약

|기준|수치|근거|
|---|---|---|
|KBO 구장 좌석 수|2만~2.5만석|잠실/사직/문학 등|
|좌석 기반 순수 TPS|**41~83 TPS**|25,000석 ÷ 300~600초|
|재시도/중복 반영 TPS|**100~300 TPS**|실패 트래픽 포함|
|실제 운영 TPS (Throttle)|**100~300 TPS**|이론 최대의 30~50%|
|KBO 기준 피크 CCU|**2.5만~10만**|DAU 전환율 5~20% + 10배 spike|
|PG 병목 TPS|**수백 TPS**|카드 승인 1~3초 latency|

### 3.2 15,000석 대응 필요 인프라 역산

**3,000석 테스트 기준으로 5배 트래픽 필요**

```
Hold TPS 목표:    500 TPS   (100 × 5)
주문 생성 TPS:    125 TPS   (25  × 5)
대기열 spike:     45,000명  (9,000 × 5)
폴링 RPS:         9,000 RPS (1,800 × 5)
```

**필요 인프라**

|항목|현재 (3,000석)|15,000석 필요 스펙|근거|
|---|---|---|---|
|seat replica|2|**10**|500 TPS ÷ 100 TPS/pod|
|order-core replica|1|**5**|125 TPS ÷ 25 TPS/pod|
|queue replica|2|**4**|9,000 RPS 폴링 대응|
|RDS|db.t4g.micro|**db.t4g.medium**|커넥션 ~400개 필요|
|Redis|cache.t4g.micro|**cache.t4g.small**|Lock + 폴링 동시 처리|
|HPA|없음|**필수**|동적 스케일링 없으면 의미 없음|
|match 정보 캐싱|없음|**Redis 캐싱 필요**|queue RDS 부하 제거|
|idempotencyKey|미구현|**구현 필요**|중복 주문 방어|

### 3.3 테스트 결과 기반 15,000석 예측

> 2부 실측값을 아래 계산식에 대입하면 15,000석 환경 예측값이 산출된다.

#### 3.3.1 계산 전제

```
확장 배율: 15,000석 ÷ 3,000석 = 5배
인프라 확장: 3.2절 스펙 적용 (seat ×5, order-core ×5, RDS 업그레이드)

지표별 계산 방식:
  Hold 성공률  → 구조적 지표, 인프라와 무관 → 실측값 그대로 유지
  Hold TPS     → 인프라 선형 확장 → 실측 안정 TPS × 5
  주문 생성 TPS → 인프라 선형 확장 → 실측 안정 TPS × 5
  응답시간 p95  → 인프라 확장 시 동일 수준 유지 예측
  대기열 spike  → 실측 안정 CCU × 5
```

#### 3.3.2 예측 계산표

**Hold 성공률 (추천 ON/OFF 비교)**

| 지표                | 3,000석 실측값 | 계산식     | 15,000석 예측값 |
| ----------------- | ---------- | ------- | ----------- |
| Hold 성공률 (추천 OFF) | — %        | 실측값 그대로 | — %         |
| Hold 성공률 (추천 ON)  | — %        | 실측값 그대로 | — %         |
| 향상폭               | — %p       | 실측값 그대로 | — %p        |

> Hold 성공률은 Lock 경합 분산 구조에서 비롯되므로 인프라 규모와 무관하다.  
> 3,000석에서 측정된 추천 ON/OFF 성공률 차이가 15,000석에서도 동일하게 유지된다.

**처리량 (TPS)**

|지표|3,000석 실측값|계산식|15,000석 예측값|
|---|---|---|---|
|안정 Hold TPS|— TPS|실측값 × 5|— TPS|
|안정 주문 생성 TPS|— TPS|실측값 × 5|— TPS|
|대기열 spike CCU|— 명|실측값 × 5|— 명|

**응답시간**

|지표|3,000석 실측값|15,000석 예측값|비고|
|---|---|---|---|
|Hold 요청 p95|— 초|실측값 수준 유지|인프라 선형 확장 기준|
|주문 생성 p95|— 초|실측값 수준 유지|RDS 업그레이드 기준|
|대기열 진입 p95|— 초|실측값 수준 유지|Redis 캐싱 적용 기준|

#### 3.3.3 KBO 레퍼런스 대비 검증

```
KBO 실제 운영 TPS (레퍼런스):  100~300 TPS
플레이볼 15,000석 예측 TPS:    [3,000석 실측 안정 TPS × 5] TPS

→ 예측값이 KBO 레퍼런스 범위(100~300 TPS) 안에 있으면:
   "실제 KBO 운영 수준에 부합하는 처리량" 으로 검증 완료

→ 예측값이 KBO 레퍼런스 범위를 초과하면:
   "KBO 실제 운영 수준을 상회하는 처리량" 으로 충분한 여유 확인
```

#### 3.3.4 예측 유효 조건

```
아래 조건이 충족될 때만 예측값이 유효하다:
  ✅ seat, order-core HPA 적용 (동적 스케일링)
  ✅ RDS db.t4g.medium 이상 (커넥션 ~400개)
  ✅ match 정보 Redis 캐싱 (queue RDS 부하 제거)
  ✅ idempotencyKey 구현 (중복 주문 방어)
  ✅ 실제 15,000석 규모 부하테스트로 최종 검증 필요

선형 확장이 성립하지 않는 구간:
  ⚠️ RDS 커넥션 임계점 초과 시 비선형으로 성능 저하
  ⚠️ Redis Lock 경합이 블록 수 대비 지수적으로 증가할 수 있음
  ⚠️ 폴링 RPS는 CCU에 비례하여 급격히 증가 (5배 → 9,000 RPS)
```

### 3.4 레퍼런스 대비 포지셔닝

```
기존 티켓팅 시스템의 접근:
  "인프라를 충분히 키워서 트래픽을 버틴다"
  "PG 병목까지 고려해 TPS를 의도적으로 throttle한다"

플레이볼의 접근:
  "추천 기반 분산으로 동일 TPS 내에서 Hold 성공률을 높인다"
  "Lock 경합을 구조적으로 줄여 시스템 처리 효율 자체를 개선한다"

→ KBO 기준 실제 운영 TPS(100~300)는 플레이볼 목표 TPS와 동일 레벨
→ 이 TPS 구간에서 추천 ON/OFF 성공률 차이가 플레이볼의 핵심 가치
→ 같은 인프라, 같은 TPS라면 추천 ON이 OFF 대비 Hold 성공률이 높음을 증명
```

---

## 부록. 개선 우선순위

|우선순위|항목|효과|
|---|---|---|
|1|HPA 도입 (seat, order-core)|동적 스케일링으로 처리량 즉시 향상|
|2|idempotencyKey 구현|중복 주문 방어, 데이터 정합성 확보|
|3|match 정보 Redis 캐싱|queue spike 시 RDS 부하 제거|
|4|RDS 스펙 업그레이드|커넥션 한계 해소|
|5|폴링 → SSE/WebSocket 전환|폴링 RPS 자체를 구조적으로 감소|

---

_2부 테스트 결과는 부하테스트 실행 후 업데이트 필요_  
_백엔드 레포 기준: 102-goormgb-backend-dev (2026-03-20)_  
_레퍼런스: KBO 구장 좌석 수 기반 역산, 국내 PG 처리량 기준, Ticketmaster/인터파크/멜론티켓 공개 사례_