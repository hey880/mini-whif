# CLAUDE-FE.md — 프론트엔드 구현 가이드

> **기반 문서**: CLAUDE.md (백엔드/전체 설계)
> **참고 디자인**: mini-whif-FE.txt (실제 서비스 UI 분석)
> **프레임워크**: Next.js 15 (App Router) + TypeScript

---

## 1. 디자인 시스템

### 1-1. 테마 — 다크 사이버펑크 (Dark Cyberpunk)
모든 페이지는 `dark` 클래스 기반 다크 테마. 라이트 모드 없음.
배경은 딥 네이비-블랙(`#0d141d`), 강조색은 라벤더-퍼플(`#ddb7ff`).

### 1-2. 컬러 토큰 (Tailwind 커스텀 컬러)
`tailwind.config.ts`에 아래 토큰을 그대로 등록한다.

```typescript
// tailwind.config.ts
colors: {
  // 배경 계층 (어두운 순)
  "background":                "#0d141d",
  "surface-dim":               "#0d141d",
  "surface-container-lowest":  "#080f17",
  "surface-container-low":     "#151c25",
  "surface-container":         "#192029",
  "surface-container-high":    "#232a34",
  "surface-container-highest": "#2e353f",
  "surface":                   "#0d141d",
  "surface-bright":            "#333a44",
  "surface-variant":           "#2e353f",

  // 텍스트
  "on-background":             "#dce3f0",
  "on-surface":                "#dce3f0",
  "on-surface-variant":        "#cfc2d6",
  "on-tertiary-fixed-variant": "#474647",

  // Primary (라벤더 퍼플)
  "primary":                   "#ddb7ff",
  "primary-container":         "#b76dff",
  "primary-fixed":             "#f0dbff",
  "primary-fixed-dim":         "#ddb7ff",
  "on-primary":                "#490080",
  "on-primary-container":      "#400071",
  "on-primary-fixed":          "#2c0051",
  "on-primary-fixed-variant":  "#6900b3",
  "inverse-primary":           "#842bd2",

  // Secondary
  "secondary":                 "#c2c6d5",
  "secondary-container":       "#444956",
  "secondary-fixed":           "#dee2f2",
  "secondary-fixed-dim":       "#c2c6d5",
  "on-secondary":              "#2b303c",
  "on-secondary-container":    "#b4b8c7",
  "on-secondary-fixed":        "#171c27",
  "on-secondary-fixed-variant":"#424753",

  // Tertiary (그레이)
  "tertiary":                  "#c8c6c7",
  "tertiary-container":        "#929091",
  "tertiary-fixed":            "#e5e2e3",
  "tertiary-fixed-dim":        "#c8c6c7",
  "on-tertiary":               "#313031",
  "on-tertiary-container":     "#2a292b",
  "on-tertiary-fixed":         "#1c1b1c",

  // 기타
  "outline":                   "#988d9f",
  "outline-variant":           "#4d4354",
  "error":                     "#ffb4ab",
  "error-container":           "#93000a",
  "on-error":                  "#690005",
  "on-error-container":        "#ffdad6",
  "surface-tint":              "#ddb7ff",
  "inverse-surface":           "#dce3f0",
  "inverse-on-surface":        "#2a313b",
}
```

### 1-3. 타이포그래피 토큰

```typescript
fontFamily: {
  "display-xl":  ["Sora", "sans-serif"],
  "headline-lg": ["Sora", "sans-serif"],
  "headline-md": ["Sora", "sans-serif"],
  "body-lg":     ["Inter", "sans-serif"],
  "body-md":     ["Inter", "sans-serif"],
  "label-md":    ["Inter", "sans-serif"],
  "label-sm":    ["Inter", "sans-serif"],
},
fontSize: {
  "display-xl":  ["48px", { lineHeight:"1.1",  letterSpacing:"-0.02em", fontWeight:"700" }],
  "headline-lg": ["32px", { lineHeight:"1.2",  fontWeight:"600" }],
  "headline-md": ["24px", { lineHeight:"1.3",  fontWeight:"600" }],
  "body-lg":     ["18px", { lineHeight:"1.6",  fontWeight:"400" }],
  "body-md":     ["16px", { lineHeight:"1.6",  fontWeight:"400" }],
  "label-md":    ["14px", { lineHeight:"1.2",  letterSpacing:"0.05em", fontWeight:"600" }],
  "label-sm":    ["12px", { lineHeight:"1.2",  fontWeight:"500" }],
}
```

**사용 패턴**: 클래스는 항상 `font-{token} text-{token}` 쌍으로 적용.
```html
<h1 class="font-display-xl text-display-xl text-on-surface">제목</h1>
<p class="font-body-md text-body-md text-on-surface-variant">본문</p>
<span class="font-label-md text-label-md text-primary uppercase tracking-widest">라벨</span>
```

### 1-4. 스페이싱 토큰

```typescript
spacing: {
  "container-padding": "2rem",
  "card-gap":          "2rem",
  "gutter":            "1.5rem",
  "chat-max-width":    "800px",
  "unit":              "8px",
}
```

### 1-5. 공통 CSS 클래스 (globals.css)

```css
/* 글래스모피즘 카드 — 메인 페이지 캐릭터 카드, 팝업 */
.glass-card {
  background: rgba(31, 41, 55, 0.4);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 글래스 패널 — 사이드바, 정보 박스 */
.glass-panel {
  background: rgba(31, 41, 55, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* AI 메시지 버블 */
.ai-bubble {
  background: rgba(46, 53, 63, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 유저 메시지 버블 */
.user-bubble {
  background: rgba(132, 43, 210, 0.15);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(221, 183, 255, 0.3);
}

/* 인기 캐릭터 카드 — primary 보라 pulse 테두리 */
.persona-pulse { position: relative; }
.persona-pulse::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(45deg, #ddb7ff, #842bd2, #ddb7ff);
  z-index: -1;
  opacity: 0.6;
}

/* 네온 글로우 버튼 */
.glow-button { box-shadow: 0 0 20px rgba(221, 183, 255, 0.2); }
.glow-button:hover { box-shadow: 0 0 30px rgba(221, 183, 255, 0.4); }

/* 스크롤바 숨김 — 태그 가로 스크롤 */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* 커스텀 스크롤바 — 채팅 메시지 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(221, 183, 255, 0.2);
  border-radius: 10px;
}

/* 캐릭터 상세 배경 그라디언트 오버레이 */
.gradient-overlay-bottom {
  background: linear-gradient(to top, rgba(8,15,23,1) 0%, rgba(8,15,23,0.8) 20%, rgba(8,15,23,0) 60%);
}
.gradient-overlay-top {
  background: linear-gradient(to bottom, rgba(8,15,23,0.7) 0%, rgba(8,15,23,0) 100%);
}

/* 로그인 입력 포커스 글로우 */
.input-glow:focus-within { box-shadow: 0 0 0 1px rgba(221, 183, 255, 0.5); }

/* 스켈레톤 shimmer */
@keyframes shimmer { 100% { transform: translateX(100%); } }
.animate-shimmer { animation: shimmer 2s infinite; }

/* Material Symbols 기본 */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

### 1-6. 외부 리소스

```html
<!-- 폰트 -->
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<!-- 아이콘 (Material Symbols) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

아이콘 FILL 변형:
```html
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">explore</span>
```

---

## 2. 라우팅 구조 (Next.js App Router)

```
apps/web/src/app/
├── layout.tsx                  # 루트 레이아웃 (html dark, 폰트, Provider)
├── page.tsx                    # 메인 → /
├── login/
│   └── page.tsx                # 로그인/회원가입 → /login
├── auth/
│   └── callback/
│       └── route.ts            # Google OAuth 콜백 Route Handler
├── characters/
│   └── [id]/
│       └── page.tsx            # 캐릭터 상세 → /characters/[id]
├── chat/
│   └── [roomId]/
│       └── page.tsx            # 채팅 → /chat/[roomId]
└── mypage/
    └── page.tsx                # 마이페이지 → /mypage
```

**보호 라우트 미들웨어** (`apps/web/src/middleware.ts`):
```typescript
// /chat/*, /mypage/* 미인증 시 /login?returnUrl=... 으로 리다이렉트
export const config = { matcher: ['/chat/:path*', '/mypage/:path*'] }
```

---

## 3. 컴포넌트 구조

```
apps/web/src/
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx              # 상단 네비 (공통)
│   │   ├── BottomNav.tsx           # 모바일 하단 탭바 (4탭)
│   │   └── Footer.tsx
│   ├── character/
│   │   ├── CharacterCard.tsx       # aspect-[3/4] glass-card 카드
│   │   ├── CharacterGrid.tsx       # grid-cols-1 sm:2 lg:4
│   │   └── CharacterCardSkeleton.tsx  # shimmer 스켈레톤
│   ├── chat/
│   │   ├── MessageBubble.tsx       # AI/유저 버블
│   │   ├── MessageActions.tsx      # Regenerate, 버전, 👍👎
│   │   ├── ChatInput.tsx           # 입력창 + 전송
│   │   ├── ChatSidebar.tsx         # 채팅 이력 (데스크탑)
│   │   ├── VersionModal.tsx        # 답변 버전 팝업
│   │   └── TypingIndicator.tsx     # 3-dot bounce
│   ├── mypage/
│   │   ├── GemWallet.tsx           # 잔액 + Quick Top-up
│   │   ├── GemProducts.tsx         # 충전 상품 3종 그리드
│   │   ├── GemLogTable.tsx         # 사용 내역 테이블
│   │   ├── MyCharacterCard.tsx     # 내 캐릭터 관리 카드
│   │   └── LlmModelSelector.tsx    # 모델 선택 드롭다운
│   └── common/
│       ├── AnnouncementPopup.tsx   # 공지 팝업 (z-[100])
│       ├── TagChip.tsx             # 태그 칩
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useInfiniteCharacters.ts    # 무한 스크롤
│   ├── useSSEChat.ts               # SSE 스트리밍
│   ├── useAuth.ts                  # Supabase 세션
│   └── useGemWallet.ts
├── stores/
│   ├── authStore.ts                # Zustand: 유저/세션
│   ├── chatStore.ts                # Zustand: 스트리밍 상태
│   └── uiStore.ts                  # Zustand: 팝업 열림 상태
└── lib/
    ├── supabase/
    │   ├── client.ts               # 브라우저용 클라이언트
    │   └── server.ts               # 서버 컴포넌트용
    ├── connectrpc/
    │   └── client.ts               # ConnectRPC 클라이언트
    └── portone.ts                  # PortOne SDK
```

---

## 4. 페이지별 UI 상세

### 4-1. 메인 페이지 (`/`)

**레이아웃**:
```
<nav> fixed top-0 z-50 bg-surface-container/80 backdrop-blur-xl border-b border-white/5
  Row 1: 로고 + UNSAFE/SAFE 상태 배지 + 알림 버튼
  Row 2: Unified Search 버튼 + #Tag Search 버튼 + 구분선 + 태그 칩 가로 스크롤 (no-scrollbar)
<main> pt-40 pb-32 px-container-padding max-w-7xl mx-auto
  <EventBanner>    h-48 sm:h-64 rounded-2xl 이미지 + 텍스트 오버레이 + 슬라이드 번호
  <CharacterGrid>  grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap
  <InfiniteLoader> shimmer 스켈레톤 4개 + 스핀 로더
<BottomNav>  fixed bottom-0 (모바일, z-[60])
<AnnouncementPopup>  fixed inset-0 z-[100]
```

**캐릭터 카드** — 핵심 구현 포인트:
```tsx
// 인기 1위 카드: persona-pulse 클래스 추가
// hover: -translate-y-2, 내부 이미지 scale-110
<div className="group relative aspect-[3/4] rounded-xl overflow-hidden glass-card
                transition-all duration-500 hover:-translate-y-2 border-white/5">
  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
  <img className="absolute inset-0 w-full h-full object-cover
                  transition-transform duration-700 group-hover:scale-110" />
  <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
    <h3 className="font-headline-md text-headline-md text-white mb-1">{name}</h3>
    <p className="font-body-md text-label-sm text-on-surface-variant line-clamp-2">{desc}</p>
  </div>
</div>
```

**모바일 하단 탭바** (4탭):
```
chat(채팅) | explore(탐색, active) | assignment_turned_in(미션) | person(마이)
active 탭: text-primary + FILL 1 아이콘
```

**공지 팝업**:
```tsx
// glass-card + border-primary/30, 중앙 배치
// "CHECK UPDATES" 버튼 + "DISMISS" 텍스트 버튼
// one_time 공지: localStorage로 표시 여부 기록
```

---

### 4-2. 로그인 페이지 (`/login`)

**레이아웃** — 좌우 2컬럼 (md 이상):
```
<body> bg-[#080f17] flex items-center justify-center
  배경 Ambiance: fixed 보라/보조 블러 원형 2개
  <main> max-w-[1200px] min-h-screen flex flex-row bg-surface-dim rounded-2xl
    <LeftColumn> hidden md:block md:w-1/2
      배경 이미지 + 하단 좌측 브랜드 카피
    <RightColumn> w-full md:w-1/2 px-8 py-16 md:px-20 lg:px-24
      모바일 헤더 (md:hidden)
      h2 "Welcome Back"
      Google 로그인 버튼
      OR EMAIL 구분선
      이메일/비밀번호 폼 (input-glow)
      SIGN IN 버튼
      회원가입 링크
      하단 카피라이트 (absolute bottom-8)
```

**Google 로그인 버튼**:
```tsx
<button
  onClick={() => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/auth/callback` }
  })}
  className="w-full flex items-center justify-center gap-3 py-4 px-4
             bg-surface-container-high hover:bg-surface-container-highest
             rounded-xl border border-white/5 font-label-md text-on-surface group"
>
  <img src="/google-icon.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" />
  Continue with Google
</button>
```

**입력 필드**:
```tsx
// 포커스 시 보라색 ring 1px — input-glow 클래스
<div className="input-glow bg-surface-container-low rounded-xl border border-white/5">
  <input className="w-full bg-transparent border-none focus:ring-0 px-5 py-4
                    text-on-surface placeholder:text-on-surface-variant/30 font-body-md" />
</div>
```

---

### 4-3. 캐릭터 상세 페이지 (`/characters/[id]`)

**레이아웃** — 전체화면 배경 이미지:
```
<div> fixed inset-0 z-0 — 배경 이미지 object-cover
  gradient-overlay-bottom + gradient-overlay-top
<nav> fixed top-0 — 투명 배경, 로고 + 메뉴 + 유저 아바타
<div> relative z-10 h-full flex flex-col justify-end
  <InfoPanel> w-full md:w-[500px] px-container-padding pb-32
    클래스 배지 (primary 텍스트)
    h1 display-xl 캐릭터 이름
    부제목 (primary, bold)
    통계 (채팅수, 평점) + 키워드 태그 뱃지 (glass-panel)
    로어 설명 (glass-panel, max-h-[200px] 스크롤)
    Share / Archive 액션 버튼 행
<div> fixed bottom-0 z-50 — CTA 영역
  "Unlock Premium 💜" animate-bounce 뱃지
  "Start Conversation" w-full rounded-full glow-button bg-primary
```

**Start Conversation 클릭 플로우**:
```
미인증 → /login?returnUrl=/characters/[id]
인증 → POST /chat-rooms (ConnectRPC) → /chat/[roomId]
```

---

### 4-4. 채팅 페이지 (`/chat/[roomId]`)

**레이아웃** — `h-screen overflow-hidden flex flex-col`:
```
<header> sticky top-0 z-50 h-16 bg-surface-container/60 backdrop-blur-xl
  뒤로가기 | 캐릭터 아바타+이름+상태 | 젬 잔액(md이상) | Share/Settings
<main> flex-1 flex overflow-hidden
  <ChatSidebar> hidden lg:flex w-80 border-r border-white/5
    Current Persona 요약 박스
    Recent Neural Links 목록
    유저 프로필 + 로그아웃
  <ChatWindow> flex-1 flex flex-col
    <MessageList> flex-1 overflow-y-auto custom-scrollbar px-container-padding py-8 space-y-8
      타임스탬프 구분선 (rounded-full bg-surface-container-high)
      AI/유저 메시지 버블
      TypingIndicator (스트리밍 대기 중)
    <MessageInput> p-container-padding pb-8
      glass-panel 컨테이너 (group-focus-within:border-primary/50)
      입력창 + 전송 버튼 (bg-primary glow-button rounded-xl)
      힌트 텍스트 (Shift+Enter 줄바꿈)
```

**AI 메시지 버블**:
```tsx
// 좌측 정렬, max-w-[85%]
<div className="flex gap-4 items-start max-w-[85%]">
  <img className="w-8 h-8 rounded-full border border-primary/30 flex-shrink-0" />
  <div className="space-y-2">
    <div className="ai-bubble p-5 rounded-2xl rounded-tl-none">{content}</div>
    <MessageActions messageId={id} hasVersions={hasVersions} />
  </div>
</div>
```

**유저 메시지 버블**:
```tsx
// 우측 정렬, flex-row-reverse
<div className="flex gap-4 items-start flex-row-reverse max-w-[85%] ml-auto">
  <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0 ...">UN</div>
  <div className="user-bubble p-5 rounded-2xl rounded-tr-none">{content}</div>
</div>
```

**타이핑 인디케이터** (isStreaming 초기):
```tsx
<div className="ai-bubble px-5 py-4 rounded-2xl rounded-tl-none flex gap-1">
  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
</div>
```

**메시지 액션 바**:
```tsx
// opacity-60, hover 시 opacity-100
<div className="flex items-center gap-3 ml-1 opacity-60 hover:opacity-100 transition-opacity">
  <button>🔄 Regenerate</button>    {/* reroll SSE 호출 */}
  <button>📚 v{versionCount}</button> {/* VersionModal 열기 */}
  <div className="flex gap-2 ml-auto">
    <button onClick={() => sendFeedback(1)}>👍</button>
    <button onClick={() => sendFeedback(0)}>👎</button>
  </div>
</div>
```

**답변 버전 팝업** (`VersionModal`):
```
fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm
  glass-card max-w-2xl max-h-[870px] flex flex-col
    헤더: "Response History" 아이콘 + 닫기 버튼
    스크롤 영역:
      최신 버전: 좌측 primary 세로선 + "Latest" 배지 + "Currently Active" 버튼(bg-primary)
      이전 버전: opacity-80/70 + "Restore this version" 버튼(border-primary/40 text-primary)
    푸터: "N Versions available" + "Clear History"
```

---

### 4-5. 마이페이지 (`/mypage`)

**레이아웃**:
```
<nav> sticky top-0 (공통 TopNav)
<main> max-w-7xl mx-auto px-container-padding py-gutter flex flex-col md:flex-row gap-card-gap
  <Sidebar> w-full md:w-64
    프로필 카드: w-20 h-20 persona-pulse 아바타 + 닉네임 + Tier 배지(rounded-full bg-primary/10)
    사이드 네비: Profile / Gem Treasury / My Characters / Persona Settings
      활성 항목: bg-primary/10 text-primary border-l-4 border-primary
  <MainContent> flex-1 flex flex-col gap-card-gap
    GemTreasury 섹션
    GemLogTable 섹션
    MyCharacters 섹션
    PersonaSettings 섹션 (LLM 모델 선택)
```

**젬 잔액 카드**:
```tsx
// 다이아몬드 아이콘: text-4xl text-primary, FILL 1, drop-shadow 네온
<span className="material-symbols-outlined text-4xl text-primary drop-shadow-[0_0_8px_rgba(221,183,255,0.8)]"
  style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
<span className="font-display-xl text-display-xl text-on-surface">{amount.toLocaleString()}</span>
// Quick Top-up 버튼: bg-primary hover:shadow-[0_0_15px_rgba(221,183,255,0.4)]
```

**젬 충전 상품** (Starter / Pro / Whale):
```tsx
// Popular 상품: border-primary/40 bg-primary/5 + absolute -top-2 "Popular" 배지
// 선택 시 border-primary 강조
// 클릭 → purchaseGem() 호출
```

**젬 사용 내역 테이블**:
```tsx
// 음수(사용): text-error "- 15"
// 양수(충전): text-primary "+ 50"
// hover:bg-white/5 tr 호버 효과
```

**내 캐릭터 카드**:
```tsx
// h-48 이미지 영역 + 하단 이름/모델 배지 오버레이
// Online: bg-primary/20 border-primary/30 text-primary
// Standby: bg-surface-container-highest border-white/10 text-on-surface-variant
// 편집/삭제 아이콘 버튼 + "Open Core" 버튼
```

**LLM 모델 선택** (`appearance-none` 커스텀 select):
```tsx
<select className="bg-surface-container-high border border-white/10 rounded-lg py-3 px-4
                   text-on-surface font-body-md focus:ring-2 focus:ring-primary
                   focus:border-transparent outline-none appearance-none cursor-pointer">
  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
</select>
```

---

## 5. 상태 관리

### Zustand 스토어

```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null
  session: Session | null
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  logout: () => void
}

// stores/chatStore.ts
interface ChatStore {
  currentRoomId: string | null
  isStreaming: boolean
  streamingContent: string        // SSE 청크 누적값 (렌더링용)
  setCurrentRoom: (id: string) => void
  setStreaming: (v: boolean) => void
  appendStreamChunk: (chunk: string) => void
  resetStream: () => void
}

// stores/uiStore.ts
interface UIStore {
  isAnnouncementOpen: boolean
  isVersionModalOpen: boolean
  versionModalMessageId: string | null
  setAnnouncementOpen: (v: boolean) => void
  openVersionModal: (messageId: string) => void
  closeVersionModal: () => void
}
```

### React Query 쿼리 키

```typescript
export const queryKeys = {
  characters: {
    list: (f: CharacterFilter) => ['characters', 'list', f] as const,
    detail: (id: string)       => ['characters', 'detail', id] as const,
  },
  keywords:      ['keywords'] as const,
  announcements: ['announcements'] as const,
  chatRooms: {
    messages: (roomId: string)    => ['chatRooms', roomId, 'messages'] as const,
    versions: (messageId: string) => ['messages', messageId, 'versions'] as const,
  },
  personas: ['personas'] as const,
  mypage: {
    wallet:  ['mypage', 'wallet'] as const,
    gemLogs: ['mypage', 'gemLogs'] as const,
  },
  llmModels: {
    all:     ['llmModels'] as const,
    current: ['llmModels', 'current'] as const,
  },
}
```

---

## 6. SSE 스트리밍 구현

```typescript
// hooks/useSSEChat.ts
export function useSSEChat() {
  const { setStreaming, appendStreamChunk, resetStream } = useChatStore()
  const queryClient = useQueryClient()

  const sendMessage = async (roomId: string, message: string) => {
    setStreaming(true)
    resetStream()

    const res = await fetch(`${AI_SERVER_URL}/v1/chats?stream=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roomId, message }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const json = JSON.parse(line.slice(6))
        if (json.is_final_event) {
          setStreaming(false)
          // 메시지 목록 + 젬 잔액 갱신
          queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.messages(roomId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.mypage.wallet })
        } else {
          appendStreamChunk(json.content)
        }
      }
    }
  }

  return { sendMessage }
}
```

**Shift+Enter 줄바꿈 처리**:
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
```

---

## 7. ConnectRPC 클라이언트

```typescript
// lib/connectrpc/client.ts
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  interceptors: [(next) => async (req) => {
    const token = await getSupabaseToken()
    req.header.set('Authorization', `Bearer ${token}`)
    return next(req)
  }]
})

export const characterClient = createClient(CharacterService, transport)
export const personaClient   = createClient(PersonaService, transport)
export const chatRoomClient  = createClient(ChatRoomService, transport)
export const llmModelClient  = createClient(LlmModelService, transport)
```

---

## 8. Google OAuth 콜백

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnUrl = searchParams.get('returnUrl') ?? '/'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}${returnUrl}`)
}
```

---

## 9. PortOne 결제 FE

```typescript
// lib/portone.ts
import PortOne from '@portone/browser-sdk/v2'

export const GEM_PRODUCTS = [
  { id: 'gem_500',  label: 'Starter', gemAmount: 500,  price: 1100, badge: null },
  { id: 'gem_1200', label: 'Pro',     gemAmount: 1200, price: 2200, badge: 'Popular' },
  { id: 'gem_3000', label: 'Whale',   gemAmount: 3000, price: 5500, badge: null },
] as const

export async function purchaseGem(productId: string) {
  // 1. BE 주문 생성
  const { orderId, amount } = await fetch('/api/payments/prepare', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  }).then(r => r.json())

  // 2. PortOne 결제창 (토스페이먼츠 테스트 채널)
  const result = await PortOne.requestPayment({
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    channelKey: 'channel-key-tosspayments-test',
    paymentId: orderId,
    orderName: `젬 충전`,
    totalAmount: amount,
    currency: 'KRW',
    payMethod: 'CARD',
  })

  if (result.code) throw new Error(result.message)

  // 3. BE 결제 검증
  await fetch('/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify({ paymentId: result.paymentId, orderId }),
  })
}
```

---

## 10. 무한 스크롤

```typescript
// hooks/useInfiniteCharacters.ts
export function useInfiniteCharacters(filters: CharacterFilter) {
  const loaderRef = useRef<HTMLDivElement>(null)

  const query = useInfiniteQuery({
    queryKey: queryKeys.characters.list(filters),
    queryFn: ({ pageParam = 0 }) =>
      characterClient.listCharacters({ ...filters, offset: pageParam, limit: 16 }),
    getNextPageParam: (last, pages) =>
      last.characters.length === 16 ? pages.length * 16 : undefined,
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && query.hasNextPage) query.fetchNextPage() },
      { threshold: 0.1 }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [query.hasNextPage])

  return { ...query, loaderRef }
}
```

---

## 11. 환경 변수 (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
NEXT_PUBLIC_API_URL="http://localhost:3000"       # Fastify
NEXT_PUBLIC_AI_SERVER_URL="http://localhost:8000" # FastAPI
NEXT_PUBLIC_PORTONE_STORE_ID="store-..."
```

---

## 12. 반응형 브레이크포인트

| 구간 | 변화 |
|---|---|
| `< 640px` | 단일 컬럼, 하단 탭바, 사이드바 숨김 |
| `640px~` (sm) | 캐릭터 그리드 2열 |
| `768px~` (md) | 로그인 좌우 2컬럼, 마이페이지 사이드바 |
| `1024px~` (lg) | 캐릭터 그리드 4열, 채팅 사이드바 |

---

## 13. 구현 순서

```
Phase 1 — 디자인 시스템
  □ tailwind.config.ts 토큰 등록
  □ globals.css 공통 CSS 작성
  □ 루트 layout.tsx (dark, 폰트, Provider)

Phase 2 — 공통 컴포넌트
  □ TopNav, BottomNav, Footer
  □ TagChip, AnnouncementPopup

Phase 3 — 페이지
  □ 로그인 (이메일 + Google OAuth)
  □ 메인 (캐릭터 그리드 + 무한 스크롤 + 태그)
  □ 캐릭터 상세 (배경 이미지 + CTA)
  □ 채팅 (SSE 스트리밍 + 버전 팝업)
  □ 마이페이지 (젬 + 캐릭터/페르소나)

Phase 4 — 연동
  □ ConnectRPC 클라이언트 연결
  □ SSE 스트리밍 실제 연동
  □ PortOne 테스트 결제
  □ Google OAuth 콜백
```

---

*mini-whif-FE.txt UI 분석과 CLAUDE.md 설계를 기반으로 작성한 FE 구현 가이드입니다.*
