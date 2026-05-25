# Logrotate 설정 가이드

## 문제 상황
Docker 컨테이너(whif:1001)가 생성하는 로그 파일을 호스트의 ubuntu(1000) 사용자가 logrotate로 처리할 때 권한 문제 발생

## 해결 방안

### 1. 사용자/그룹 설정 (사전 작업 완료)
- ubuntu 사용자: whif 그룹에 소속
- whif 사용자: whif 그룹에 소속
- 로그 디렉토리: whif:whif 소유, 775 권한
- 로그 파일: whif:whif 소유, 664 권한 (그룹 쓰기 가능)

### 2. Docker 설정 (자동 적용)
Dockerfile과 entrypoint 스크립트에서 자동으로 처리:
- 로그 디렉토리 생성 시 775 권한 설정
- 로그 파일 생성 시 664 권한 설정 (umask 002)
- 컨테이너 시작 시 권한 자동 확인/수정

### 3. Logrotate 설정

#### EC2에서 실행할 명령어:

```bash
# 1. logrotate 설정 파일 복사
sudo cp /home/ubuntu/mini-whif/logrotate/mini-whif-api /etc/logrotate.d/
sudo cp /home/ubuntu/mini-whif/logrotate/mini-whif-ai /etc/logrotate.d/

# 2. 설정 파일 권한 설정
sudo chmod 644 /etc/logrotate.d/mini-whif-api
sudo chmod 644 /etc/logrotate.d/mini-whif-ai

# 3. 기존 로그 파일 권한 수정 (최초 1회)
sudo chown -R whif:whif /home/ubuntu/mini-whif/logs
sudo chmod 775 /home/ubuntu/mini-whif/logs/api /home/ubuntu/mini-whif/logs/ai
sudo chmod 664 /home/ubuntu/mini-whif/logs/api/*.log /home/ubuntu/mini-whif/logs/ai/*.log

# 4. 테스트
sudo logrotate -f /etc/logrotate.d/mini-whif-api
sudo logrotate -f /etc/logrotate.d/mini-whif-ai

# 5. 권한 확인
ls -la /home/ubuntu/mini-whif/logs/api/
ls -la /home/ubuntu/mini-whif/logs/ai/
```

#### Logrotate 설정 파일 내용 설명

**su whif whif**: logrotate를 whif 사용자 권한으로 실행
**create 0664 whif whif**: 새로 생성되는 로그 파일의 권한과 소유자
**copytruncate**: 파일을 복사 후 truncate (프로세스 재시작 불필요)
**rotate 7**: 7일치 로그 보관
**daily**: 매일 로테이션
**compress**: 오래된 로그 압축
**missingok**: 파일 없어도 에러 없음
**notifempty**: 빈 파일은 로테이션 안 함

### 4. 자동화된 배포

GitHub Actions 배포 스크립트에 권한 설정 자동화 추가됨 (`.github/workflows/deploy.yml` 참고)

### 5. 검증

배포 후 확인 사항:
```bash
# 로그 파일 권한 확인
ls -la /home/ubuntu/mini-whif/logs/api/
# 예상: drwxrwxr-x whif whif (디렉토리)
# 예상: -rw-rw-r-- whif whif (파일)

# logrotate 수동 실행 테스트
sudo logrotate -f /etc/logrotate.d/mini-whif-api

# 에러 없이 실행되는지 확인
echo $?  # 0이어야 함
```

## 권한 구조 요약

```
디렉토리: 775 (rwxrwxr-x)
- owner(whif): rwx (읽기/쓰기/실행)
- group(whif): rwx (읽기/쓰기/실행)
- others: r-x (읽기/실행만)

파일: 664 (rw-rw-r--)
- owner(whif): rw (읽기/쓰기)
- group(whif): rw (읽기/쓰기)
- others: r (읽기만)
```

ubuntu 사용자가 whif 그룹에 속해있으므로 그룹 권한(rw)으로 로그 파일 접근 가능
