# 0. 요약 테이블

| 우선순위 | 추가 도메인         | 핵심 지표                        | 이유                  |
| ---- | -------------- | ---------------------------- | ------------------- |
| P1   | Hold           | attempt/success/fail/expired | 핵심 KPI(락 성공률) 직접 측정 |
| P2   | Hold (mode 태그) | recommend vs map 성공률 비교      | 추천 분산 효과 검증         |
| P2   | 추천 운영          | degrade/fallback 발동 횟수       | 정책 운영 가시화           |
| P3   | 주문 퍼널          | order_draft_enter            | Hold→결제 전환율 분모 확보   |
| P3   | 결제 세분화         | method 태그, 무통장 만료            | 장애 원인 빠른 식별         |
# 1. Hold 성공률
Hold 성공률이 없으면 "추천이 실제로 분산 효과를 냈는가"를 증명할 방법이 부재.
```
//Hold 시도 횟수 (Counter)
ticketing_seat_hold_attempt_total   

//Hold 성공 횟수 (Counter)
ticketing_seat_hold_success_total   

//경합 실패 횟수 (Counter)
ticketing_seat_hold_fail_total

//결제 미완료로 만료된 횟수 (Counter)
ticketing_seat_hold_expired_total
```
# 2. 추천모드 vs 좌석 모드 성공률 비교
현재 추천 관련 지표들은 모두 단순 집계(총 횟수).
추천이 분산 효과를 냈는지 검증하려면 **모드 태그**가 필요
```
// 기존 Hold 카운터에 mode 태그 추가
ticketing_seat_hold_attempt_total{mode="recommend"}
ticketing_seat_hold_attempt_total{mode="map"}
ticketing_seat_hold_success_total{mode="recommend"}
ticketing_seat_hold_success_total{mode="map"}
```
# 3. 사용자 퍼널 전환율
결제 전환율을 계산하려면 분모가 필요한데, Hold 성공 이후 주문서 진입 수가 부재.
```
// Hold 성공 → 주문서 진입 전환율 분모
// 주문서 화면 진입 횟수 (Counter)
ticketing_order_draft_enter_total   

// 결제 수단별 성공률 세분화 (태그 추가)
ticketing_payment_success_total{method="kakaopay"}
ticketing_payment_success_total{method="tosspay"}
ticketing_payment_success_total{method="bank_transfer"}

// 무통장 입금 전용
//기한 내 미입금으로 자동 취소 (Counter)
ticketing_payment_bank_transfer_expired_total
```