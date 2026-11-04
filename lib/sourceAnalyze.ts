/**
 * 기존 시스템 소스(폴더·파일 목록·일부 내용)를 읽어 기능점수 입력을 추정한다.
 * 인증 FP 산정이 아니라, 화면·엔티티·API 규모를 가늠하는 휴리스틱이다.
 *
 * 보정 원칙
 *  - 화면: pages/·*Page·라우트만 센다. components/hooks/tsx 전체를 화면으로 치지 않는다.
 *  - 리포트: 엑셀·다운로드 파일/API만 센다. JS `export` 키워드는 리포트가 아니다.
 *  - 기능: Java 컨트롤러·@Entity·매핑을 우선 읽고, REST 1개를 단위기능 1개로 세지 않되
 *    컨트롤러·쓰기 API 규모가 화면보다 크면 그 규모를 따른다(과소 방지).
 */

import type { FunctionCounts } from "./estimate";

export interface SourceFileIn {
  path: string;
  size?: number;
  content?: string;
}

export interface SourceAnalysis {
  fileCount: number;
  skipped: number;
  byLang: Record<string, number>;
  byKind: Record<string, number>;
  controllers: string[];
  entities: string[];
  pages: string[];
  mappers: string[];
  clients: string[];
  mappings: { get: number; write: number };
  counts: FunctionCounts;
  externalLinks: number;
  assumptions: string[];
  notes: string[];
}

const SKIP =
  /(^|[\\/])(node_modules|\.git|target|dist|build|\.next|out|bin|obj|\.idea|\.vscode|coverage|\.gradle|\.cursor|vendor)([\\/]|$)/i;
const SKIP_TEST =
  /(^|[\\/])(src[\\/]tests?|__tests__|__mocks__)([\\/]|$)|[\s\S]*\.(test|spec)\.(java|kt|ts|tsx|js|jsx)$/i;
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|jar|war|class|woff2?|ttf|eot|mp4|mp3|exe|dll|so)$/i;

function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function isNoisePath(path: string): boolean {
  const n = norm(path);
  if (!n) return true;
  if (SKIP.test(n) || BINARY.test(n) || SKIP_TEST.test(n)) return true;
  return false;
}

/** 내용 읽기 우선순위. 컨트롤러·엔티티·라우트를 node_modules보다 먼저 연다. */
export function contentPriority(path: string): number {
  const n = norm(path).toLowerCase();
  if (/controller\.(java|kt)$/.test(n) || /\/controller\//.test(n)) return 100;
  if (/\/entity\/.*\.(java|kt)$/.test(n)) return 95;
  if (/(repository|mapper|dao)\.(java|kt|xml)$/.test(n)) return 90;
  if (/feign|webclient|resttemplate|\bsso\b/.test(n)) return 85;
  if (/\/routes?\//.test(n)) return 80;
  if (/\/pages?\//.test(n) || /(page|screen)\.(tsx|jsx)$/.test(n)) return 75;
  if (/\.(java|kt)$/.test(n)) return 60;
  if (/\/services\//.test(n) && /\.(ts|js)$/.test(n)) return 55;
  if (/\.(tsx|jsx|vue|jsp)$/.test(n)) return 40;
  if (/\.(ts|js)$/.test(n)) return 30;
  return 10;
}

function extOf(p: string): string {
  const m = p.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function langOf(ext: string): string | null {
  if (["java", "kt"].includes(ext)) return "Java/Kotlin";
  if (["xml", "jsp", "tag"].includes(ext)) return "JSP/XML";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return "JavaScript/TypeScript";
  if (["vue"].includes(ext)) return "Vue";
  if (["sql"].includes(ext)) return "SQL";
  if (["yml", "yaml", "properties"].includes(ext)) return "설정";
  if (["html", "css", "scss"].includes(ext)) return "웹 화면";
  return null;
}

function isTestType(path: string): boolean {
  const n = path.toLowerCase();
  return /testcontroller|databasetest/i.test(n) || /\/src\/test\//i.test(n);
}

function isPageFile(path: string): boolean {
  const n = path.toLowerCase();
  if (/\.(jsp|vue)$/i.test(n)) return true;
  if (/\.html$/i.test(n) && /\/(pages?|views|screens|public)\//i.test(n)) return true;
  if (/(page|screen)\.(tsx|jsx|vue)$/i.test(n)) return true;
  if (/\/(pages?|views|screens)\//i.test(n) && /\.(tsx|jsx|vue|jsp)$/i.test(n)) {
    if (/\/(components|hooks|layout|common\/ui|ui)\//i.test(n)) return false;
    return true;
  }
  return false;
}

function kindOf(path: string, content: string): string {
  const n = path.toLowerCase();
  const c = content;
  if (isTestType(n)) return "other";
  if (/@(rest)?controller\b/i.test(c) || /controller\.(java|kt)$/i.test(n) || /\/controller\//i.test(n)) return "controller";
  if (/@entity\b/i.test(c)) return "entity";
  if (/\/entity\/.*\.(java|kt)$/i.test(n) && !/(dto|vo|request|response|search)/i.test(n)) return "entity";
  if (/(repository|mapper|dao)\.(java|kt|xml)$/i.test(n) || /@(repository|mapper)\b/i.test(c)) return "mapper";
  if (/@feignclient\b/i.test(c)) return "client";
  if (isExternalCall(c, n)) return "client";
  if (/service\.(java|kt)$/i.test(n) || /@service\b/i.test(c)) return "service";
  if (isPageFile(n)) return "page";
  if (/\.sql$/i.test(n)) return "sql";
  if (/\.(yml|yaml|properties)$/i.test(n)) return "config";
  return "other";
}

function isExternalCall(content: string, path: string): boolean {
  if (/\/config\//i.test(path) || /configuration\.(java|kt)$/i.test(path) || /SecurityConfig/i.test(path)) return false;
  if (/@feignclient\b/i.test(content)) return true;
  if (/\bRestTemplate\b/.test(content) && /\.(getForObject|postForObject|postForEntity|getForEntity|exchange)\s*\(/.test(content)) return true;
  if (/\bWebClient\b/.test(content) && /\.(get|post|put|patch|delete|mutate)\s*\(/.test(content)) return true;
  return false;
}

function countMappings(content: string): { get: number; write: number } {
  if (!content) return { get: 0, write: 0 };
  const get = (content.match(/@(GetMapping|RequestMapping\s*\([^)]*(?:GET|RequestMethod\.GET))/g) || []).length;
  const write = (content.match(/@(PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping\s*\([^)]*(?:POST|PUT|PATCH|DELETE|RequestMethod\.(?:POST|PUT|PATCH|DELETE)))/g) || []).length;
  return { get, write };
}

function countFeHttp(content: string, path: string): { get: number; write: number } {
  if (!content || !/\/services?\//i.test(path)) return { get: 0, write: 0 };
  const get = (content.match(/\.get\s*\(|method\s*:\s*['"]GET['"]/gi) || []).length;
  const write = (content.match(/\.post\s*\(|\.put\s*\(|\.patch\s*\(|\.delete\s*\(|method\s*:\s*['"](POST|PUT|PATCH|DELETE)['"]/gi) || []).length;
  return { get, write };
}

function extractRoutes(content: string, path: string): string[] {
  const n = path.replace(/\\/g, "/");
  if (!content || (!/\/routes?\//i.test(n) && !/\.routes?\.(t|j)sx?$/i.test(n))) return [];
  const found: string[] = [];
  for (const m of content.matchAll(/path\s*:\s*['"`](\/[^'"`]*)['"`]/g)) {
    const p = m[1];
    if (!p || p.includes("${") || p === "/*" || p === "*") continue;
    found.push(p.replace(/\/:[^/]+/g, "/:id"));
  }
  return found;
}

function isJobFile(path: string, content: string): boolean {
  const n = path.toLowerCase();
  if (/@Scheduled\b/.test(content)) return true;
  if (/(scheduler|scheduledjob|batchjob)\.(java|kt)$/i.test(n)) return true;
  if (/\/batch\/.*\/.*(job|scheduler|task)\.(java|kt)$/i.test(n)) return true;
  return false;
}

function isReportish(path: string, content: string): boolean {
  const base = (norm(path).split("/").pop() || path).toLowerCase();
  if (/excel|workbook/.test(base)) return true;
  if (/(export|report).*(service|controller|request)/i.test(base)) return true;
  if (content && /(XSSFWorkbook|SXSSFWorkbook|HSSFWorkbook|ExcelWriter|exportExcel|downloadExcel|createExcel)/i.test(content)) return true;
  return false;
}

function baseName(p: string): string {
  const parts = norm(p).split("/");
  return parts[parts.length - 1] || p;
}

/** 붙여넣은 트리·dir 목록에서 경로만 추출 */
export function parsePathList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[│├└─\s*|]+/, "").trim().replace(/^["']+|["']+$/g, ""))
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      if (/\.[A-Za-z0-9]+$/.test(l)) return l;
      const m = l.match(/([A-Za-z0-9_./\\-]+\.[A-Za-z0-9]+)/);
      return m ? m[1] : "";
    })
    .filter(Boolean);
}

function uniq(list: string[]): string[] {
  return [...new Set(list)];
}

export function analyzeSources(files: SourceFileIn[]): SourceAnalysis {
  const byLang: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  const controllers: string[] = [];
  const entities: string[] = [];
  const pageFiles: string[] = [];
  const mappers: string[] = [];
  const clients: string[] = [];
  const routePaths: string[] = [];
  let skipped = 0;
  let mappings = { get: 0, write: 0 };
  let feHttp = { get: 0, write: 0 };
  let scheduled = 0;
  let reportish = 0;
  let javaFiles = 0;

  const seen = new Set<string>();

  for (const f of files) {
    const path = norm(f.path);
    if (isNoisePath(path)) {
      skipped += 1;
      continue;
    }
    if (seen.has(path)) continue;
    seen.add(path);

    const ext = extOf(path);
    const lang = langOf(ext);
    if (lang) byLang[lang] = (byLang[lang] || 0) + 1;
    else {
      skipped += 1;
      continue;
    }
    if (lang === "Java/Kotlin") javaFiles += 1;

    const content = (f.content || "").slice(0, 80_000);
    if (isTestType(path)) {
      byKind.other = (byKind.other || 0) + 1;
      continue;
    }
    const kind = kindOf(path, content);
    byKind[kind] = (byKind[kind] || 0) + 1;

    if (kind === "controller") controllers.push(baseName(path));
    if (kind === "entity") entities.push(baseName(path));
    if (kind === "page") pageFiles.push(baseName(path));
    if (kind === "mapper") mappers.push(baseName(path));
    if (kind === "client") clients.push(baseName(path));

    const m = countMappings(content);
    mappings = { get: mappings.get + m.get, write: mappings.write + m.write };
    const fe = countFeHttp(content, path);
    feHttp = { get: feHttp.get + fe.get, write: feHttp.write + fe.write };
    for (const r of extractRoutes(content, path)) routePaths.push(r);
    if (isJobFile(path, content)) scheduled += 1;
    if (isReportish(path, content)) reportish += 1;
  }

  const fileCount = [...seen].filter((p) => langOf(extOf(p))).length;
  const ctrl = controllers.length;
  const ent = entities.length || (mappers.length ? Math.max(2, Math.round(mappers.length * 0.7)) : 0);

  const screens = Math.max(pageFiles.length, uniq(routePaths).length);
  const javaApi = mappings.get + mappings.write > 0;
  const eiFromApi = javaApi ? mappings.write : feHttp.write;
  const eqFromApi = javaApi ? mappings.get : feHttp.get;

  /* REST 1건 ≠ 단위기능 1건. 다만 컨트롤러·쓰기 API가 화면보다 크면 그 규모를 쓴다. */
  const ei = Math.max(ctrl > 0 ? ctrl * 2 : 0, eiFromApi > 0 ? Math.round(eiFromApi * 0.65) : 0, screens > 0 ? Math.round(screens * 0.9) : 0, 4);
  const eq = Math.max(screens, eqFromApi > 0 ? Math.round(eqFromApi * 0.35) : 0, 4);
  const eo = Math.max(1, reportish + Math.min(6, scheduled) + Math.round(screens * 0.12));
  const ilf = Math.max(2, ent);
  const eif = clients.length > 0 ? Math.max(clients.length, Math.round(ilf * 0.1)) : Math.round(ilf * 0.12);
  const externalLinks = eif > 0 ? Math.min(Math.max(clients.length, eif), 8) : 0;

  const counts: FunctionCounts = { ilf, eif, ei, eo, eq };

  const apiNote = javaApi
    ? `애너테이션 기준 API: 조회(GET) ${mappings.get} · 등록/수정/삭제 ${mappings.write} → 단위기능 EI ${ei} / EQ ${eq}로 보정`
    : feHttp.get + feHttp.write > 0
      ? `프론트 서비스 HTTP 호출로 API 규모를 보완했습니다. 조회 ${feHttp.get} · 변경 ${feHttp.write}`
      : javaFiles > 0
        ? "Java 파일은 있으나 매핑 애너테이션을 못 읽어 컨트롤러·화면 수로 기능을 추정했습니다. 폴더 업로드 시 더 정확합니다."
        : "백엔드(Java) 소스가 보이지 않습니다. API 폴더를 함께 올리면 기능이 빠지지 않습니다.";

  const assumptions: string[] = [
    `분석 파일 ${fileCount.toLocaleString()}개 (제외 ${skipped.toLocaleString()}개: 의존성·빌드·테스트·바이너리)`,
    `언어: ${Object.entries(byLang).map(([k, v]) => `${k} ${v}`).join(", ") || "식별 안 됨"}`,
    `컨트롤러 ${ctrl}개, 엔티티 ${ilf}종, 화면 ${screens}개(페이지 ${pageFiles.length} · 라우트 ${uniq(routePaths).length}), 매퍼/DAO ${mappers.length}개, 외부연계 ${clients.length}개`,
    apiNote,
    `리포트·엑셀 ${reportish} · 배치/스케줄 ${scheduled} (JS export 키워드는 리포트로 세지 않음)`,
    `기능점수 입력으로 변환: ILF ${ilf} / EIF ${eif} / EI ${ei} / EO ${eo} / EQ ${eq}, 연계 ${externalLinks}개`,
  ];

  const notes = [
    "화면은 pages 폴더·*Page 파일·라우트 경로만 집계합니다. 공통 컴포넌트는 화면 수가 아닙니다.",
    "REST 엔드포인트는 단위기능으로 1:1 대응하지 않고 컨트롤러·화면 규모로 보정합니다.",
    "이 분석은 소스 구조로 규모를 가늠하는 참고치입니다. KOSA 기능점수 전문가 산정을 대체하지 않습니다.",
  ];

  return {
    fileCount,
    skipped,
    byLang,
    byKind,
    controllers: controllers.slice(0, 40),
    entities: entities.slice(0, 40),
    pages: (screens === uniq(routePaths).length ? uniq(routePaths) : pageFiles).slice(0, 40),
    mappers: mappers.slice(0, 40),
    clients: uniq(clients).slice(0, 40),
    mappings: javaApi ? mappings : feHttp,
    counts,
    externalLinks,
    assumptions,
    notes,
  };
}
