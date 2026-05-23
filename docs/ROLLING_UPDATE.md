# 무중단 배포 (Rolling Update) 가이드

## 개요

현재 배포 방식은 단일 EC2 인스턴스에서 `docker-compose up -d`를 사용하므로 컨테이너 재시작 시 짧은 다운타임이 발생합니다.
이 문서는 무중단 배포(Zero-downtime Deployment)를 구현하기 위한 여러 방법을 설명합니다.

## 현재 배포 방식의 한계

### 다운타임 발생 원인

1. `docker-compose up -d`는 기존 컨테이너를 중지하고 새 컨테이너를 시작
2. 중지 → 시작 사이에 약 5-10초의 서비스 중단
3. 동시에 여러 컨테이너가 재시작되면 다운타임 증가

### 현재 배포 흐름

```
기존 컨테이너 실행 중
   ↓
docker-compose up -d 실행
   ↓
[다운타임 시작] 기존 컨테이너 중지
   ↓
새 컨테이너 시작 (이미지 pull, 컨테이너 생성, 헬스체크)
   ↓
[다운타임 종료] 새 컨테이너 준비 완료
```

## 방법 1: Docker Swarm (추천 - 단순함)

### 개요

- Docker 기본 제공 오케스트레이션 툴
- 단일 노드에서도 롤링 업데이트 지원
- 추가 비용 없음 (기존 EC2 활용)

### 장단점

**장점:**
- 설정 간단 (docker-compose.yml 재사용 가능)
- 자동 롤링 업데이트, 헬스체크, 재시작
- 추가 인프라 불필요

**단점:**
- Kubernetes보다 기능 제한적
- 단일 노드 장애 시 전체 서비스 중단 (HA 구성 필요 시 노드 추가)

### 구현 단계

#### 1. Swarm 모드 초기화

```bash
# EC2에 SSH 접속
ssh ubuntu@<EC2_IP>

# Swarm 모드 초기화
docker swarm init

# 확인
docker node ls
```

#### 2. docker-compose.yml을 stack 파일로 변환

기존 `docker-compose.prod.yml`에 업데이트 정책 추가:

```yaml
version: '3.8'

services:
  api:
    # ... 기존 설정 ...
    deploy:
      replicas: 2  # 최소 2개 인스턴스 (롤링 업데이트용)
      update_config:
        parallelism: 1  # 한 번에 1개씩 업데이트
        delay: 10s      # 다음 업데이트까지 대기 시간
        failure_action: rollback  # 실패 시 자동 롤백
        monitor: 30s    # 업데이트 성공 여부 모니터링 시간
      rollback_config:
        parallelism: 1
        delay: 5s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 350M
        reservations:
          memory: 256M

  ai-server:
    # ... 기존 설정 ...
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 30s
      # ... (api와 동일)

  web:
    # ... 기존 설정 ...
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 30s
      # ... (api와 동일)
```

#### 3. 헬스체크 추가 (중요!)

롤링 업데이트가 제대로 작동하려면 컨테이너 상태 확인 필요:

```yaml
api:
  # ... 기존 설정 ...
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 40s  # 초기 시작 시간 여유

ai-server:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 40s

web:
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 40s
```

#### 4. 배포 스크립트 수정

`.github/workflows/deploy.yml`:

```yaml
# 이미지 빌드
docker-compose -f docker-compose.prod.yml build --no-cache --pull web
docker-compose -f docker-compose.prod.yml build --pull api ai-server

# Swarm stack 배포 (자동 롤링 업데이트)
docker stack deploy -c docker-compose.prod.yml mini-whif --with-registry-auth

# 배포 상태 확인
docker stack ps mini-whif

# 서비스 상태 확인 (롤링 업데이트 진행 상황)
docker service ls

echo "✅ Rolling update in progress. Check with: docker service ps mini-whif_api"
```

#### 5. 배포 확인

```bash
# 서비스 목록 (REPLICAS 열에서 진행 상황 확인)
docker service ls

# 특정 서비스의 롤링 업데이트 상태
docker service ps mini-whif_api

# 로그 확인
docker service logs mini-whif_api -f

# 롤백 (문제 발생 시)
docker service rollback mini-whif_api
```

### 예상 롤링 업데이트 흐름

```
시작: api 서비스 2개 인스턴스 실행 중
   ↓
새 이미지로 업데이트 시작
   ↓
[1단계] 기존 인스턴스 1개 유지, 새 인스턴스 1개 시작
   ↓
새 인스턴스 헬스체크 통과 대기 (30초)
   ↓
새 인스턴스 준비 완료 → 기존 인스턴스 1개 종료
   ↓
10초 대기 (delay)
   ↓
[2단계] 남은 기존 인스턴스 1개 → 새 인스턴스로 교체
   ↓
완료: 모든 인스턴스가 새 버전으로 업데이트
```

**다운타임: 0초** (항상 최소 1개 이상 인스턴스 실행 중)

### 단일 노드 제약사항

**주의:**
- replicas: 2로 설정해도 단일 EC2에서는 같은 포트를 공유할 수 없음
- 따라서 로드 밸런서 또는 Swarm 내부 라우팅 메시 필요

**해결책:**
- `mode: global` 사용 (노드당 1개 인스턴스)
- 또는 포트 매핑 제거하고 Nginx 리버스 프록시 추가

#### Nginx 리버스 프록시 설정 예시

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    deploy:
      replicas: 1

  api:
    # ports 제거 (내부 통신만)
    expose:
      - "3000"
    deploy:
      replicas: 2

  web:
    expose:
      - "3001"
    deploy:
      replicas: 2
```

```nginx
# nginx.conf
upstream api_backend {
    server api:3000;
}

upstream web_backend {
    server web:3001;
}

server {
    listen 80;

    location /api/ {
        proxy_pass http://api_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://web_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 방법 2: Blue-Green 배포 (Nginx 리버스 프록시)

### 개요

- 두 개의 독립적인 환경 운영 (Blue: 현재, Green: 새 버전)
- Nginx에서 트래픽 스위칭

### 장단점

**장점:**
- 빠른 롤백 (Nginx 설정만 변경)
- 운영 환경 그대로 테스트 가능

**단점:**
- 리소스 2배 필요 (두 환경 동시 실행)
- 스크립트 복잡도 증가
- 데이터베이스 마이그레이션 처리 복잡

### 구현 개요

```bash
# Blue 환경 (현재 운영 중)
docker-compose -f docker-compose.blue.yml up -d

# Green 환경 (새 버전 배포)
docker-compose -f docker-compose.green.yml up -d

# 헬스체크 통과 확인
curl http://localhost:3002/health  # Green 환경

# Nginx 설정 변경 (Blue → Green)
nginx -s reload

# Blue 환경 종료
docker-compose -f docker-compose.blue.yml down
```

**Nginx 설정:**
```nginx
upstream backend {
    server localhost:3001;  # Blue
    # server localhost:3002;  # Green (주석 해제하여 전환)
}
```

## 방법 3: AWS ECS Fargate

### 개요

- 서버리스 컨테이너 서비스
- 자동 롤링 업데이트, 오토 스케일링

### 장단점

**장점:**
- EC2 관리 불필요
- 자동 롤링 업데이트 지원
- 로드 밸런서 통합

**단점:**
- 비용 증가 (EC2보다 비쌈)
- AWS 종속성

### 마이그레이션 단계

1. ECR에 Docker 이미지 푸시
2. ECS 태스크 정의 생성 (docker-compose.yml 변환)
3. ECS 서비스 생성 (롤링 업데이트 정책 설정)
4. ALB 연결
5. GitHub Actions에서 ECS 배포

**비용 예상 (서울 리전):**
- Fargate vCPU 0.25, 메모리 0.5GB: 약 $15/월 (1개 태스크)
- 3개 서비스 × 2 replicas = 6개 태스크: 약 $90/월

## 방법 4: Kubernetes (EKS)

### 개요

- 엔터프라이즈급 컨테이너 오케스트레이션
- 자동 롤링 업데이트, 자동 복구, 오토 스케일링

### 장단점

**장점:**
- 프로덕션 표준
- 풍부한 생태계 (Helm, Istio 등)
- 멀티 클라우드 지원

**단점:**
- 높은 학습 곡선
- 관리 복잡도 증가
- 비용 높음 (EKS 컨트롤 플레인 $73/월 + 워커 노드)

### 적용 시나리오

- 트래픽이 매우 높아질 때 (일 10만+ 요청)
- 마이크로서비스가 10개 이상으로 증가할 때
- 멀티 리전 배포가 필요할 때

## 권장 사항

### 현재 단계 (MVP, 초기 사용자)

- **현재 방식 유지** (docker-compose + 짧은 다운타임 허용)
- 비용 효율적, 관리 간단

### 성장 단계 1 (월간 활성 사용자 1,000명+)

- **Docker Swarm** 도입
- 최소 비용으로 무중단 배포 구현
- 단일 EC2에서 시작 가능

### 성장 단계 2 (월간 활성 사용자 10,000명+)

- **AWS ECS Fargate** 또는 **Multi-node Swarm**
- 오토 스케일링 필요
- 고가용성 확보 (최소 2개 AZ)

### 엔터프라이즈 (월간 활성 사용자 100,000명+)

- **Kubernetes (EKS)**
- 마이크로서비스 아키텍처
- 멀티 리전, CDN, 글로벌 로드 밸런싱

## 다음 단계

1. **단기 (현재)**: deploy.yml 수정으로 재시작 문제 해결
2. **중기 (사용자 증가 시)**: Docker Swarm 전환 검토
3. **장기 (스케일 아웃 필요 시)**: ECS 또는 Kubernetes 마이그레이션

## 참고 자료

- Docker Swarm 공식 문서: https://docs.docker.com/engine/swarm/
- AWS ECS 롤링 업데이트: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html
- Kubernetes 롤링 업데이트: https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/
