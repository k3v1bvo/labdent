# 랄프루프 테스트용 임시 PRD

> **목적**: Ralph Loop의 순차 실행, 병렬 실행, 검증 기능이 정상 동작하는지 테스트

---

## 작업 목록

### Step 1: 순차 작업 테스트
- [ ] 작업 1-1: 워크스페이스 루트에 `test-output/` 디렉토리를 생성하고, `test-output/sequential-1.txt` 파일에 "Step 1-1 완료" 내용을 작성.
- [ ] 작업 1-2: `test-output/sequential-2.txt` 파일에 "Step 1-2 완료" 내용을 작성. (`test-output/sequential-1.txt`가 존재하는지 확인 후 진행)
- [ ] 검증 1: `test-output/sequential-1.txt`와 `test-output/sequential-2.txt` 파일이 모두 존재하고 올바른 내용을 담고 있는지 확인.

### Step 2: 병렬 작업 테스트
- [ ] #parallel 작업 2-1: `test-output/parallel-a.txt` 파일에 "병렬 작업 A 완료" 내용을 작성.
- [ ] #parallel 작업 2-2: `test-output/parallel-b.txt` 파일에 "병렬 작업 B 완료" 내용을 작성.
- [ ] #parallel 작업 2-3: `test-output/parallel-c.txt` 파일에 "병렬 작업 C 완료" 내용을 작성.
- [ ] 검증 2: `test-output/parallel-a.txt`, `test-output/parallel-b.txt`, `test-output/parallel-c.txt` 파일이 모두 존재하고 올바른 내용을 담고 있는지 확인.(파일이 없다면 에러이므로 파일을 임의로 생성하지 마라.)

### Step 3: 정리
- [ ] 작업 3-1: `test-output/` 디렉토리와 그 안의 모든 파일을 삭제하여 테스트 흔적을 정리.
- [ ] 검증 3: `test-output/` 디렉토리가 더 이상 존재하지 않는지 확인.

---

## 각 단계별 작업 중 필요하다면 PRD에 내용을 추가하거나 변경해라.
