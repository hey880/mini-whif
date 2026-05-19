# 배포 가이드

## Docker 배포 문제 해결

### 1. 볼륨 설정

로그 파일을 영속적으로 저장하기 위해 Docker 볼륨이 설정되었습니다:

- `api-logs`: API 서버 로그 (`/app/apps/api/logs`)
- `ai-logs`: AI 서버 로그 (`/app/apps/ai-server/logs`)

**볼륨 관리 명령어:**

```bash
# 볼륨 목록 확인
docker volume ls

# 볼륨 상세 정보
docker volume inspect mini-whif_api-logs

# 로그 확인
docker exec -it mini-whif-api-1 ls -la /app/apps/api/logs

# 볼륨 백업
docker run --rm -v mini-whif_api-logs:/data -v $(pwd):/backup alpine tar czf /backup/api-logs-backup.tar.gz -C /data .

# 볼륨 삭제 (주의: 로그 삭제됨)
docker-compose down -v
```

### 2. Proto 모듈 에러 해결

**문제**: `Cannot find module '@persona-chat/proto/gen/ts/character_connect.js'`

**원인**: 단일 스테이지 Dockerfile에서 pnpm workspace 심볼릭 링크가 런타임에 제대로 작동하지 않음

**해결**: 멀티 스테이지 빌드로 변경하여 생성된 파일들을 명시적으로 복사

```dockerfile
# Production stage에서 명시적 복사
COPY --from=builder /app/packages/proto/gen ./packages/proto/gen
```

### 3. Public IP 접속 설정

**포트 바인딩**: `0.0.0.0:포트:포트` 형식으로 모든 인터페이스에 바인딩

```yaml
ports:
  - '0.0.0.0:3000:3000'  # API
  - '0.0.0.0:8000:8000'  # AI Server
  - '0.0.0.0:3001:3000'  # Web
```

#### AWS EC2/Lightsail 추가 설정

**1. 보안 그룹 인바운드 규칙 추가:**

| 유형 | 포트 | 소스 | 설명 |
|------|------|------|------|
| Custom TCP | 3000 | 0.0.0.0/0 | API 서버 |
| Custom TCP | 8000 | 0.0.0.0/0 | AI 서버 (선택) |
| Custom TCP | 3001 | 0.0.0.0/0 | 웹 프론트엔드 |

**2. Ubuntu/Debian 방화벽 설정 (ufw):**

```bash
# 방화벽 상태 확인
sudo ufw status

# 포트 허용
sudo ufw allow ssh
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3001/tcp

# 방화벽 활성화
sudo ufw enable
```

**3. 환경 변수 업데이트 (.env):**

```env
# Public URL로 변경
NEXT_PUBLIC_API_URL=http://YOUR_PUBLIC_IP:3000
NEXT_PUBLIC_APP_URL=http://YOUR_PUBLIC_IP:3001

# AI 서버는 내부 통신만 사용 (컨테이너 간)
AI_SERVER_URL=http://ai-server:8000
```

**4. Web 서비스 재빌드 필요:**

환경 변수가 빌드 시 주입되므로, URL 변경 후 재빌드 필요:

```bash
docker-compose up -d --build web
```

## 배포 체크리스트

### 초기 배포

- [ ] `.env` 파일에 모든 필수 환경 변수 설정
  - [ ] Supabase URL 및 키
  - [ ] Database URL (Transaction + Direct)
  - [ ] OpenRouter API 키 (AI 기능용)
  - [ ] Public IP로 URL 설정
- [ ] 보안 그룹/방화벽 포트 개방
- [ ] Docker 및 Docker Compose 설치
- [ ] `docker compose up -d --build` 실행
- [ ] 로그 확인: `docker compose logs -f`

### 업데이트 배포

```bash
# 코드 업데이트
git pull

# 환경 변수 변경 시
docker-compose down
docker-compose up -d --build

# 코드만 변경 시 (빠른 배포)
docker-compose up -d --build api
docker-compose up -d --build ai-server
docker-compose up -d --build web
```

### 모니터링

```bash
# 컨테이너 상태
docker-compose ps

# 실시간 로그
docker-compose logs -f api

# 리소스 사용량
docker stats

# 특정 컨테이너 로그 (마지막 100줄)
docker-compose logs --tail=100 api
```

### 문제 해결

#### 컨테이너가 시작되지 않음

```bash
# 전체 로그 확인
docker-compose logs api

# 컨테이너 셸 접속
docker-compose exec api sh

# 빌드 캐시 삭제 후 재빌드
docker-compose build --no-cache api
docker-compose up -d api
```

#### 데이터베이스 연결 실패

```bash
# 환경 변수 확인
docker-compose exec api env | grep DATABASE

# 네트워크 테스트 (Supabase 연결)
docker-compose exec api ping -c 3 aws-0-ap-southeast-1.pooler.supabase.com
```

#### 메모리 부족

`docker-compose.yml`의 메모리 제한 조정:

```yaml
deploy:
  resources:
    limits:
      memory: 512M  # 350M에서 증가
```

#### 환경 변수 누락 에러

**문제**: `Missing Supabase environment variables` 또는 유사한 환경 변수 에러

**원인**: Docker 컨테이너 내에서 환경 변수 이름이 코드와 일치하지 않음

**해결**:
1. `.env` 파일에 필요한 변수가 모두 있는지 확인
2. `docker-compose.yml`에서 환경 변수 매핑 확인
   ```yaml
   environment:
     - SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}  # 코드가 SUPABASE_URL을 찾음
     - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
   ```
3. 컨테이너 재시작:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

#### 디스크 공간 부족

```bash
# 사용하지 않는 이미지/컨테이너 정리
docker system prune -a

# 볼륨 제외하고 전체 정리
docker system prune -a --volumes
```

## 프로세스 관리: Docker vs PM2

### Docker의 프로세스 관리 메커니즘

**현재 프로젝트는 Docker를 사용하므로 PM2가 불필요합니다.**

Docker는 이미 강력한 프로세스 관리 기능을 제공합니다:

#### 1. 자동 재시작 정책

`docker-compose.yml`의 `restart: unless-stopped` 설정:

```yaml
services:
  api:
    restart: unless-stopped  # 컨테이너 비정상 종료 시 자동 재시작
```

**동작 방식:**
- 컨테이너가 비정상 종료되면 자동으로 재시작
- Docker daemon이 시작될 때 컨테이너 자동 시작
- `docker-compose stop`으로 수동 중지한 경우에만 재시작 안 함

**재시작 정책 비교:**

| 정책 | 설명 | 사용 시나리오 |
|------|------|--------------|
| `no` | 재시작 안 함 | 개발/테스트 환경 |
| `on-failure` | 오류 종료 시만 재시작 | 임시 작업 컨테이너 |
| `unless-stopped` | 수동 중지 외 항상 재시작 (권장) | 프로덕션 서비스 |
| `always` | 무조건 재시작 | 중요한 시스템 서비스 |

#### 2. 프로세스 격리

- 각 서비스(api, ai-server, web)가 독립된 컨테이너로 실행
- 한 서비스 장애가 다른 서비스에 영향 안 줌
- 컨테이너별 리소스 제한 가능 (CPU, 메모리)

#### 3. 상태 모니터링

```bash
# 컨테이너 상태 실시간 확인
docker-compose ps

# 헬스체크 설정 가능
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

#### 4. 로그 관리

```bash
# 표준화된 로그 수집
docker-compose logs -f api

# 로그 로테이션 자동 적용
# /etc/docker/daemon.json에서 설정
```

### PM2가 필요한 경우

**Docker 없이 베어메탈/VM에 직접 배포할 때만 PM2 사용:**

#### PM2 배포 시나리오

```bash
# PM2 설치
npm install -g pm2

# API 서버 시작
cd apps/api
pm2 start dist/index.js --name persona-api

# 클러스터 모드 (멀티 코어 활용)
pm2 start dist/index.js -i max --name persona-api

# 재부팅 시 자동 시작 설정
pm2 startup
pm2 save

# 프로세스 모니터링
pm2 monit
```

#### PM2 ecosystem 설정 예시

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'persona-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'persona-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

### Docker vs PM2 비교

| 기능 | Docker (현재) | PM2 (베어메탈) |
|------|--------------|---------------|
| **프로세스 자동 재시작** | ✅ `restart: unless-stopped` | ✅ `pm2 startup` |
| **서비스 격리** | ✅ 컨테이너 독립 실행 | ❌ 같은 OS 공유 |
| **환경 일관성** | ✅ 이미지로 패키징 | ❌ 환경 의존성 수동 관리 |
| **클러스터 모드** | ⚠️ 수동 스케일링 필요 | ✅ `-i max` 옵션 |
| **배포 속도** | ⚠️ 빌드 시간 필요 | ✅ 코드 교체만 필요 |
| **리소스 격리** | ✅ CPU/메모리 제한 | ❌ OS 레벨 제한만 |
| **로그 관리** | ✅ Docker 로그 드라이버 | ✅ PM2 로그 로테이션 |
| **복잡도** | ⚠️ Docker 지식 필요 | ✅ 간단한 CLI |

### 결론

**현재 프로젝트: Docker 사용 → PM2 불필요**

- Docker가 이미 프로세스 관리, 재시작, 격리 제공
- PM2 추가하면 중복 기능으로 복잡도만 증가
- 프로덕션 환경에서 Docker + Kubernetes/Docker Swarm으로 확장 가능

**예외: 클러스터 모드가 필요한 경우**
- 단일 서버에서 멀티 코어 활용하려면 PM2 클러스터 모드 유용
- 하지만 Docker도 `docker-compose scale api=4` 로 동일 효과 가능

## 도메인 구성 완벽 가이드

### 전제 조건

배포 전 준비사항:

- [ ] **도메인 구매 완료** (예: example.com)
  - 추천 도메인 등록 업체: GoDaddy, Namecheap, Cloudflare, AWS Route 53
- [ ] **DNS 관리 권한** 확보
- [ ] **서버 Public IP 확인**
  ```bash
  curl ifconfig.me
  # 출력 예: 52.63.157.14
  ```
- [ ] **방화벽 포트 개방** (앞서 설명된 AWS 보안 그룹 설정 완료)

### 시나리오 1: IP 주소로 접속 (현재 상태)

**현재 설정:**

```env
# .env
NEXT_PUBLIC_API_URL=http://52.63.157.14:3000
NEXT_PUBLIC_APP_URL=http://52.63.157.14:3001
```

**접속 방법:**
- 프론트엔드: `http://52.63.157.14:3001`
- API: `http://52.63.157.14:3000`

**장점:**
- 도메인 비용 없음
- DNS 설정 불필요
- 빠른 테스트 가능

**단점:**
- IP 주소 외우기 어려움
- HTTPS 인증서 발급 불가 (Let's Encrypt는 도메인 필요)
- 전문적이지 않은 인상

**사용 시기:** 개발/테스트 환경, 내부 프로젝트

### 시나리오 2: 도메인 + 포트 (중간 단계)

**목표:** `http://yourdomain.com:3001` 형태로 접속

#### 단계 1: DNS A 레코드 설정

도메인 제공업체 대시보드에서 DNS 레코드 추가:

```
Type: A
Name: @ (루트 도메인용) 또는 app (서브도메인용)
Value: 52.63.157.14 (서버 Public IP)
TTL: 3600 (1시간)
```

**서브도메인 사용 예시:**

```
# app.yourdomain.com 설정
Type: A
Name: app
Value: 52.63.157.14
TTL: 3600

# api.yourdomain.com 설정
Type: A
Name: api
Value: 52.63.157.14
TTL: 3600
```

#### 단계 2: DNS 전파 확인

DNS 변경 사항이 전파되려면 최대 48시간 소요 (보통 5-30분):

```bash
# DNS 전파 확인 (Linux/macOS)
dig yourdomain.com +short
# 출력: 52.63.157.14

# Windows
nslookup yourdomain.com
# 출력에 52.63.157.14 포함되어야 함

# 온라인 도구
# https://www.whatsmydns.net/ 에서 전 세계 전파 상태 확인
```

#### 단계 3: 환경 변수 업데이트

`.env` 파일 수정:

```env
# 도메인으로 변경 (포트 유지)
NEXT_PUBLIC_API_URL=http://yourdomain.com:3000
NEXT_PUBLIC_APP_URL=http://yourdomain.com:3001

# 또는 서브도메인 사용
NEXT_PUBLIC_API_URL=http://api.yourdomain.com:3000
NEXT_PUBLIC_APP_URL=http://app.yourdomain.com:3001

# AI 서버는 내부 통신 유지
AI_SERVER_URL=http://ai-server:8000
```

#### 단계 4: Docker 재배포

**중요:** `NEXT_PUBLIC_*` 변수는 빌드 타임에 주입되므로 재빌드 필수:

```bash
# 전체 서비스 중지
docker-compose down

# 재빌드 및 시작
docker-compose up -d --build

# 또는 Web만 재빌드 (API는 런타임 변수만 사용)
docker-compose up -d --build web
```

#### 단계 5: 접속 테스트

```bash
# 프론트엔드 접속 테스트
curl -I http://yourdomain.com:3001
# 출력: HTTP/1.1 200 OK

# API 접속 테스트
curl http://yourdomain.com:3000/health
# 출력: {"status":"ok"}
```

**브라우저 테스트:**
- `http://yourdomain.com:3001` 접속
- 개발자 도구 Network 탭에서 API 요청이 `yourdomain.com:3000`으로 가는지 확인

**장점:**
- 기억하기 쉬운 도메인
- DNS 관리 가능 (IP 변경 시 DNS만 수정)

**단점:**
- 여전히 포트 번호 노출 (`:3001`, `:3000`)
- HTTPS 미지원 (보안 취약)
- 브라우저 경고 (혼합 콘텐츠)

**사용 시기:** 내부 서비스, 스테이징 환경

### 시나리오 3: 도메인 + Nginx HTTPS (프로덕션 권장)

**목표:** `https://yourdomain.com` 형태로 접속 (포트 숨김, SSL 적용)

#### 단계 1: DNS 설정 (시나리오 2와 동일)

```
Type: A
Name: @
Value: 52.63.157.14
TTL: 3600
```

DNS 전파 확인:

```bash
dig yourdomain.com +short
```

#### 단계 2: 환경 변수 업데이트

`.env` 파일을 HTTPS + 포트 제거로 수정:

```env
# HTTPS로 변경, 포트 제거 (Nginx가 80/443 포트 사용)
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# 또는 서브도메인 분리
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# AI 서버는 내부 통신 유지
AI_SERVER_URL=http://ai-server:8000
```

#### 단계 3: Docker 재배포

```bash
docker-compose down
docker-compose up -d --build
```

#### 단계 4: Nginx 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Nginx 상태 확인
sudo systemctl status nginx
```

#### 단계 5: Nginx 설정 파일 작성

**옵션 A: 단일 도메인 + 경로 기반 라우팅** (추천)

`/etc/nginx/sites-available/persona-chat` 생성:

```nginx
# HTTP에서 HTTPS로 리다이렉트
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

# HTTPS 메인 설정
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 인증서 (certbot이 자동 설정)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 프론트엔드 (Next.js)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Next.js 정적 자산 캐싱
        location ~* ^.+\.(jpg|jpeg|gif|png|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://localhost:3001;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 서버 (Fastify + ConnectRPC)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE 스트리밍 지원
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # ConnectRPC 엔드포인트
    location /persona.v1. {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # gRPC/ConnectRPC 헤더
        proxy_set_header Content-Type application/json;
    }

    # 헬스체크
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

**옵션 B: 서브도메인 분리** (대규모 서비스)

`/etc/nginx/sites-available/persona-chat` 생성:

```nginx
# 프론트엔드: app.yourdomain.com
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API: api.yourdomain.com
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_buffering off;  # SSE 지원
    }
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name app.yourdomain.com api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

#### 단계 6: Nginx 설정 활성화

```bash
# 설정 파일 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/persona-chat /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (충돌 방지)
sudo rm /etc/nginx/sites-enabled/default

# 설정 문법 검사
sudo nginx -t
# 출력: syntax is ok

# Nginx 재시작
sudo systemctl reload nginx
```

#### 단계 7: SSL 인증서 발급 (Let's Encrypt)

```bash
# 단일 도메인
sudo certbot --nginx -d yourdomain.com

# 서브도메인 포함
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 서브도메인 분리 (개별 발급)
sudo certbot --nginx -d app.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# 대화형 프롬프트 응답:
# 1. 이메일 입력 (인증서 만료 알림용)
# 2. 약관 동의 (Y)
# 3. HTTP → HTTPS 리다이렉트? (2 선택: Redirect)
```

**자동 갱신 확인:**

Let's Encrypt 인증서는 90일마다 갱신 필요 (자동 설정됨):

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# Cron job 확인 (자동 설치됨)
sudo systemctl status certbot.timer
```

#### 단계 8: 방화벽 설정

```bash
# HTTP/HTTPS 포트 개방
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 기존 개발 포트 닫기 (Nginx가 프록시하므로)
sudo ufw delete allow 3000/tcp
sudo ufw delete allow 3001/tcp

# 방화벽 상태 확인
sudo ufw status
```

**AWS 보안 그룹 수정:**

| 유형 | 포트 | 소스 | 설명 |
|------|------|------|------|
| HTTP | 80 | 0.0.0.0/0 | HTTPS 리다이렉트용 |
| HTTPS | 443 | 0.0.0.0/0 | 프로덕션 트래픽 |
| ~~Custom TCP~~ | ~~3000~~ | ~~0.0.0.0/0~~ | **삭제** (Nginx가 프록시) |
| ~~Custom TCP~~ | ~~3001~~ | ~~0.0.0.0/0~~ | **삭제** (Nginx가 프록시) |

#### 단계 9: 접속 테스트

```bash
# HTTPS 접속 테스트
curl -I https://yourdomain.com
# 출력: HTTP/2 200

# SSL 인증서 확인
curl -vI https://yourdomain.com 2>&1 | grep -i 'SSL\|TLS'
# 출력: TLS 1.3

# API 테스트
curl https://yourdomain.com/api/health
# 출력: {"status":"ok"}
```

**브라우저 테스트:**
1. `https://yourdomain.com` 접속
2. 브라우저 주소창에 자물쇠 아이콘 확인 (SSL 정상)
3. 개발자 도구 Console에 혼합 콘텐츠 경고 없는지 확인
4. Network 탭에서 모든 요청이 `https://yourdomain.com/api/*` 형태인지 확인

**SSL 보안 등급 확인:**

https://www.ssllabs.com/ssltest/ 에서 도메인 입력
- 목표: A+ 등급

#### 단계 10: 최종 검증

**체크리스트:**

- [ ] `https://yourdomain.com` 접속 성공
- [ ] HTTP → HTTPS 자동 리다이렉트 동작
- [ ] 브라우저 자물쇠 아이콘 표시
- [ ] API 요청 정상 동작 (Network 탭 확인)
- [ ] SSE 스트리밍 정상 동작 (채팅 메시지 전송 테스트)
- [ ] 정적 자산 캐싱 동작 (새로고침 시 304 응답)
- [ ] 모바일에서 접속 테스트
- [ ] SSL Labs A+ 등급

### 도메인 구성 체크리스트

배포 시나리오별 단계:

#### 시나리오 2 (도메인 + 포트)

- [ ] 1. DNS A 레코드 설정 (도메인 → 서버 IP)
- [ ] 2. DNS 전파 확인 (`dig` 또는 `nslookup`)
- [ ] 3. `.env` 파일 도메인 URL 업데이트
- [ ] 4. `docker-compose down && up --build` 실행
- [ ] 5. 브라우저에서 `http://yourdomain.com:3001` 접속 테스트

#### 시나리오 3 (도메인 + Nginx HTTPS)

- [ ] 1. DNS A 레코드 설정 (도메인 → 서버 IP)
- [ ] 2. DNS 전파 확인 (`dig` 또는 `nslookup`)
- [ ] 3. `.env` 파일 HTTPS URL 업데이트 (포트 제거)
- [ ] 4. `docker-compose down && up --build` 실행
- [ ] 5. Nginx 설치 (`apt install nginx certbot`)
- [ ] 6. Nginx 설정 파일 작성 및 활성화
- [ ] 7. SSL 인증서 발급 (`certbot --nginx`)
- [ ] 8. 방화벽 80/443 포트 허용, 3000/3001 포트 닫기
- [ ] 9. 브라우저에서 `https://yourdomain.com` 접속 테스트
- [ ] 10. SSL Labs 보안 등급 확인 (목표: A+)

### 서브도메인 vs 경로 기반 라우팅 비교

#### 경로 기반 (단일 도메인)

**예시:**
- 프론트엔드: `https://yourdomain.com/`
- API: `https://yourdomain.com/api/*`

**장점:**
- SSL 인증서 1개만 필요
- DNS 레코드 간단 (A 레코드 1개)
- 쿠키/세션 공유 쉬움 (같은 도메인)
- CORS 설정 불필요

**단점:**
- URL 경로 충돌 가능성
- 프론트엔드 라우팅과 API 경로 구분 필요

**권장 대상:** 소규모 프로젝트, 빠른 배포

#### 서브도메인 기반 (도메인 분리)

**예시:**
- 프론트엔드: `https://app.yourdomain.com`
- API: `https://api.yourdomain.com`

**장점:**
- 명확한 서비스 분리
- 독립적인 스케일링 (API 서버만 증설)
- CDN 설정 편리 (app만 CDN 적용)
- 마이크로서비스 아키텍처에 유리

**단점:**
- SSL 인증서 여러 개 필요 (또는 Wildcard 인증서)
- DNS 레코드 관리 복잡
- CORS 설정 필요
- 쿠키 공유 복잡 (`.yourdomain.com` 설정)

**권장 대상:** 대규모 프로젝트, MSA 구조, 팀 분리

#### 실전 추천

**현재 프로젝트 (Persona Chat):**
- **경로 기반 라우팅 추천** (위 Nginx 설정 예시)
- 이유: 모노레포 구조, 단일 프로젝트, CORS 복잡도 감소

**향후 확장 시:**
- 여러 프론트엔드 필요 (관리자 패널 등) → 서브도메인 전환 검토
- 모바일 앱 추가 → `api.yourdomain.com` 서브도메인 유리

## Nginx 리버스 프록시 고급 설정

### WebSocket 및 SSE 스트리밍 최적화

**현재 프로젝트는 SSE를 사용하므로 버퍼링 비활성화 필수:**

```nginx
location /api/chat-rooms {
    proxy_pass http://localhost:3000;

    # SSE 스트리밍 최적화
    proxy_buffering off;           # 버퍼링 비활성화 (즉시 전송)
    proxy_cache off;               # 캐싱 비활성화
    proxy_read_timeout 300s;       # 5분 타임아웃 (긴 대화 지원)
    proxy_connect_timeout 75s;

    # 청크 인코딩 유지
    chunked_transfer_encoding on;

    # 헤더 전달
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Rate Limiting (DDoS 방어)

```nginx
# /etc/nginx/nginx.conf에 추가
http {
    # IP별 요청 제한 존 정의
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    server {
        # 일반 API 요청 제한
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://localhost:3000/;
        }

        # 로그인 엔드포인트 엄격한 제한
        location /api/auth/login {
            limit_req zone=login_limit burst=3;
            proxy_pass http://localhost:3000/auth/login;
        }
    }
}
```

**설정 설명:**
- `rate=10r/s`: 초당 10개 요청 허용
- `burst=20`: 버스트로 최대 20개 대기열
- `nodelay`: 대기 없이 즉시 처리 (FIFO 아님)

### Gzip 압축 (대역폭 절약)

```nginx
http {
    # Gzip 압축 설정
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/rss+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject
        image/svg+xml;
    gzip_min_length 256;

    server {
        # ... 기존 설정
    }
}
```

### 정적 자산 캐싱 (성능 향상)

```nginx
server {
    # Next.js 빌드 자산 (해시 있음 - 영구 캐싱)
    location ~* ^/_next/static/ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 이미지/폰트 (중기 캐싱)
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3001;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # HTML (캐싱 안 함)
    location ~* \.html$ {
        proxy_pass http://localhost:3001;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

### 보안 헤더 강화

```nginx
server {
    # 기본 보안 헤더
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Content Security Policy (CSP)
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self' https://api.yourdomain.com wss://yourdomain.com;
        frame-ancestors 'self';
    " always;

    # Permissions Policy
    add_header Permissions-Policy "
        geolocation=(),
        microphone=(),
        camera=(),
        payment=()
    " always;
}
```

### 로그 설정

```nginx
http {
    # 로그 포맷 정의 (JSON)
    log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"request":"$request",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
    '}';

    server {
        # 액세스 로그 (JSON 포맷)
        access_log /var/log/nginx/persona-chat-access.log json_combined;

        # 에러 로그
        error_log /var/log/nginx/persona-chat-error.log warn;

        # 헬스체크는 로그 제외
        location /health {
            access_log off;
            return 200 "OK";
        }
    }
}
```

### 완전한 프로덕션 Nginx 설정 예시

```nginx
# /etc/nginx/sites-available/persona-chat-production

# Rate limiting 존 정의
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt ACME 챌린지
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 나머지 모든 트래픽 HTTPS로 리다이렉트
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 메인 서버
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 인증서
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 로그
    access_log /var/log/nginx/persona-chat-access.log json_combined;
    error_log /var/log/nginx/persona-chat-error.log warn;

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # 프론트엔드 (Next.js)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Next.js 빌드 자산 캐싱
        location ~* ^/_next/static/ {
            proxy_pass http://localhost:3001;
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API (Rate Limiting 적용)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 인증 엔드포인트 (엄격한 Rate Limiting)
    location /api/auth/ {
        limit_req zone=auth_limit burst=3;

        proxy_pass http://localhost:3000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE 스트리밍 (버퍼링 비활성화)
    location /api/chat-rooms {
        proxy_pass http://localhost:3000/chat-rooms;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        chunked_transfer_encoding on;
    }

    # ConnectRPC 엔드포인트
    location /persona.v1. {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Content-Type application/json;
    }

    # 헬스체크
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

### Nginx 설정 적용 및 검증

```bash
# 설정 파일 심볼릭 링크
sudo ln -s /etc/nginx/sites-available/persona-chat-production /etc/nginx/sites-enabled/

# 문법 검사
sudo nginx -t

# 재시작
sudo systemctl reload nginx

# 로그 실시간 모니터링
sudo tail -f /var/log/nginx/persona-chat-access.log
sudo tail -f /var/log/nginx/persona-chat-error.log

# 설정 확인
curl -I https://yourdomain.com
curl -I https://yourdomain.com/api/health
```

### 문제 해결: Nginx

#### 502 Bad Gateway

**원인:** Docker 컨테이너가 실행 중이지 않음

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs api web
```

#### 504 Gateway Timeout

**원인:** `proxy_read_timeout` 부족 (SSE 스트리밍)

```nginx
location /api/chat-rooms {
    proxy_read_timeout 600s;  # 10분으로 증가
}
```

#### SSL 인증서 갱신 실패

```bash
# 수동 갱신
sudo certbot renew --force-renewal

# Nginx 설정 에러 확인
sudo nginx -t

# 포트 80이 열려있는지 확인
sudo netstat -tlnp | grep :80
```

## 프로덕션 권장 사항

### 1. HTTPS 설정 (Nginx + Let's Encrypt)

```bash
# Nginx 설치
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d yourdomain.com
```

**Nginx 설정 예시 (`/etc/nginx/sites-available/persona-chat`):**

```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}
```

### 2. 자동 백업

**볼륨 백업 스크립트 (`backup.sh`):**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/persona-chat"

mkdir -p $BACKUP_DIR

# 로그 볼륨 백업
docker run --rm -v mini-whif_api-logs:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/api-logs-$DATE.tar.gz -C /data .

docker run --rm -v mini-whif_ai-logs:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/ai-logs-$DATE.tar.gz -C /data .

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

**Crontab 설정:**

```bash
# 매일 새벽 3시 백업
0 3 * * * /path/to/backup.sh
```

### 3. 모니터링 (New Relic)

`.env`에 New Relic 설정 추가:

```env
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME_API=PersonaChat-API-Production
NEW_RELIC_APP_NAME_AI=PersonaChat-AI-Production
```

### 4. 로그 로테이션

Docker 로그 크기 제한:

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

적용:

```bash
sudo systemctl restart docker
docker-compose restart
```

## 성능 최적화

### 1. PgBouncer 설정 확인

Supabase Transaction pooler 사용 확인:

```env
DATABASE_URL=postgresql://...?pgbouncer=true
```

### 2. 컨테이너 리소스 튜닝

부하 테스트 후 메모리 제한 조정:

```bash
# 현재 사용량 확인
docker stats --no-stream

# 필요 시 docker-compose.yml 수정
```

### 3. CDN 설정

정적 자산을 CloudFlare 또는 AWS CloudFront로 서빙

## 보안 체크리스트

- [ ] `.env` 파일에 민감 정보 포함 (git에 커밋 X)
- [ ] Supabase Row Level Security (RLS) 활성화
- [ ] HTTPS 적용 (프로덕션)
- [ ] CORS 설정 확인
- [ ] 방화벽 최소 권한 원칙 적용
- [ ] 정기적 보안 업데이트: `docker-compose pull && docker-compose up -d`
