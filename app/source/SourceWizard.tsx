"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calculator, FileUp, Home, ListTree } from "lucide-react";
import { DEFAULT_INPUT, type EstimateInput } from "@/lib/estimate";
import { analyzeSources, contentPriority, isNoisePath, parsePathList, type SourceAnalysis, type SourceFileIn } from "@/lib/sourceAnalyze";
import AppShell, { USAGE_ADMIN_KEY } from "@/components/AppShell";
import ResultView from "@/components/ResultView";
import { Card, Field, inputCls } from "@/components/ui";

const TEXT_EXT = /\.(java|kt|xml|jsp|js|jsx|ts|tsx|vue|sql|yml|yaml|properties|html)$/i;
const ZIP_EXT = /\.(zip)$/i;
const MAX_FILES = 5000;
const MAX_READ = 600;
const MAX_BYTES = 120_000;

type Picked = { path: string; file: File };

type FsNode = {
  kind: string;
  name: string;
  getFile?: () => Promise<File>;
  values?: () => AsyncIterable<FsNode>;
};

async function walkHandle(dir: FsNode, prefix: string, out: Picked[]) {
  if (!dir.values || out.length >= MAX_FILES) return;
  for await (const entry of dir.values()) {
    if (out.length >= MAX_FILES) return;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      if (isNoisePath(path) || !entry.values) continue;
      await walkHandle(entry, path, out);
      continue;
    }
    if (!entry.getFile || isNoisePath(path)) continue;
    out.push({ path, file: await entry.getFile() });
  }
}

function readEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  return new Promise((resolve, reject) => {
    const next = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(all);
          return;
        }
        all.push(...batch);
        next();
      }, reject);
    };
    next();
  });
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: Picked[]) {
  if (out.length >= MAX_FILES) return;
  const path = prefix || entry.name;
  if (entry.isDirectory) {
    if (prefix && isNoisePath(path)) return;
    const children = await readEntries(entry as FileSystemDirectoryEntry);
    for (const child of children) {
      await walkEntry(child, `${path}/${child.name}`, out);
    }
    return;
  }
  if (!entry.isFile || isNoisePath(path)) return;
  const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
  out.push({ path, file });
}

async function toSources(items: Picked[]): Promise<SourceFileIn[]> {
  const ranked = items
    .filter((it) => it.path && !isNoisePath(it.path))
    .sort((a, b) => contentPriority(b.path) - contentPriority(a.path))
    .slice(0, MAX_FILES);
  const out: SourceFileIn[] = [];
  let read = 0;
  for (const it of ranked) {
    const item: SourceFileIn = { path: it.path, size: it.file.size };
    if (read < MAX_READ && it.file.size > 0 && it.file.size <= MAX_BYTES && TEXT_EXT.test(it.path)) {
      try {
        item.content = await it.file.text();
        read += 1;
      } catch {
        /* 경로는 남긴다 */
      }
    }
    out.push(item);
  }
  return out;
}

function mergeRoot(prev: SourceFileIn[], root: string, next: SourceFileIn[]): SourceFileIn[] {
  const prefix = `${root}/`;
  const kept = prev.filter((f) => f.path !== root && !f.path.startsWith(prefix));
  return [...kept, ...next].slice(0, MAX_FILES);
}

async function expandZip(file: File): Promise<Picked[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const out: Picked[] = [];
  const names = Object.keys(zip.files);
  for (const name of names) {
    if (out.length >= MAX_FILES) break;
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    const path = name.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!path || isNoisePath(path)) continue;
    const blob = await entry.async("blob");
    const base = path.split("/").pop() || path;
    out.push({ path, file: new File([blob], base) });
  }
  return out;
}

async function pickedFromUpload(file: File): Promise<{ root: string; picked: Picked[] }> {
  if (ZIP_EXT.test(file.name)) {
    const picked = await expandZip(file);
    const root = file.name.replace(/\.zip$/i, "") || "source.zip";
    return { root, picked: picked.map((p) => ({ ...p, path: `${root}/${p.path}` })) };
  }
  return { root: "선택한 파일", picked: [{ path: filePathOf(file), file }] };
}

function filePathOf(file: File): string {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, "/");
}

type TransferItem = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<(FsNode & { kind: string; name: string }) | null>;
};

/** 보안 프로그램이 entry를 비워도 files / handle은 남는 경우가 있다. */
async function collectDropped(dt: DataTransfer): Promise<Picked[]> {
  const out: Picked[] = [];
  const items = Array.from(dt.items) as TransferItem[];

  for (const item of items) {
    if (typeof item.getAsFileSystemHandle !== "function") continue;
    try {
      const handle = await item.getAsFileSystemHandle();
      if (!handle) continue;
      if (handle.kind === "directory") {
        await walkHandle(handle, handle.name, out);
      } else if (handle.getFile) {
        const file = await handle.getFile();
        out.push({ path: file.name, file });
      }
    } catch {
      /* 다음 방법 */
    }
  }
  if (out.length) return out;

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) await walkEntry(entry, entry.name, out);
  }
  if (out.length) return out;

  for (const item of items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) out.push({ path: filePathOf(file), file });
  }
  if (out.length) return out;

  for (const file of Array.from(dt.files)) {
    out.push({ path: filePathOf(file), file });
  }
  return out;
}

function groupByRoot(picked: Picked[]): Map<string, Picked[]> {
  const groups = new Map<string, Picked[]>();
  for (const it of picked) {
    const root = it.path.split("/")[0] || it.path;
    const list = groups.get(root) || [];
    list.push(it);
    groups.set(root, list);
  }
  return groups;
}

async function expandDropped(picked: Picked[]): Promise<Picked[]> {
  const out: Picked[] = [];
  for (const it of picked) {
    if (ZIP_EXT.test(it.file.name) || ZIP_EXT.test(it.path)) {
      const { picked: inner } = await pickedFromUpload(it.file);
      out.push(...inner);
    } else {
      out.push(it);
    }
  }
  return out;
}

export default function SourceWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [paste, setPaste] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<Partial<EstimateInput>>({});
  const [busy, setBusy] = useState("");
  const [held, setHeld] = useState<SourceFileIn[]>([]);
  const [roots, setRoots] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [showDev, setShowDev] = useState(false);
  const folderPathRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("admin") === "1") {
        localStorage.setItem(USAGE_ADMIN_KEY, "1");
      }
      setShowDev(localStorage.getItem(USAGE_ADMIN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const input: EstimateInput = useMemo(() => {
    if (!analysis) return { ...DEFAULT_INPUT, title, mode: "detail", inputCoverage: 1 };
    return {
      ...DEFAULT_INPUT,
      title: title || "기존 시스템 소스 분석",
      description: analysis.assumptions[0] || "",
      mode: "detail",
      counts: analysis.counts,
      externalLinks: analysis.externalLinks,
      inputCoverage: 1,
      ...overrides,
    };
  }, [analysis, title, overrides]);

  const publish = (files: SourceFileIn[], rootNames: string[]) => {
    if (!files.length) {
      setError("분석할 소스를 찾지 못했습니다. 프로젝트 전체를 zip으로 묶어 올려 주세요.");
      return;
    }
    setHeld(files);
    setRoots(rootNames);
    setFileLabel(`${rootNames.join(", ")} · 소스 ${files.length.toLocaleString()}개`);
    setAnalysis(analyzeSources(files));
  };

  const addPicked = async (root: string, picked: Picked[]) => {
    const sources = await toSources(picked);
    const merged = mergeRoot(held, root, sources);
    const names = roots.includes(root) ? roots : [...roots, root];
    publish(merged, names);
  };

  const ingestUpload = async (file: File) => {
    setError("");
    const isZip = ZIP_EXT.test(file.name);
    setBusy(isZip ? "압축 파일을 푸는 중…" : "파일을 읽는 중…");
    try {
      const { root, picked } = await pickedFromUpload(file);
      if (!picked.length) {
        setError(isZip ? "zip 안에서 분석할 소스를 찾지 못했습니다." : "분석할 파일을 찾지 못했습니다.");
        return;
      }
      if (isZip) {
        await addPicked(root, picked);
        return;
      }
      const sources = await toSources(picked);
      const map = new Map(held.map((f) => [f.path, f]));
      for (const src of sources) map.set(src.path, src);
      const names = roots.includes("선택한 파일") ? roots : [...roots, "선택한 파일"];
      publish(Array.from(map.values()), names);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const pickFile = async () => {
    setError("");
    const openFile = (
      window as Window & {
        showOpenFilePicker?: (opts?: {
          multiple?: boolean;
          types?: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<{ getFile: () => Promise<File> }[]>;
      }
    ).showOpenFilePicker;
    if (!openFile) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const handles = await openFile({
        multiple: false,
        types: [
          {
            description: "소스 압축(zip)",
            accept: {
              "application/zip": [".zip"],
              "application/x-zip-compressed": [".zip"],
            },
          },
        ],
      });
      const file = await handles[0].getFile();
      await ingestUpload(file);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "AbortError") return;
      fileInputRef.current?.click();
    }
  };

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    setError("");
    setBusy("놓은 항목을 읽는 중…");
    try {
      const raw = await collectDropped(event.dataTransfer);
      if (!raw.length) {
        setError("놓은 파일을 읽지 못했습니다. zip 1개를 이 칸에 놓거나 압축 올리기 버튼을 사용하세요.");
        return;
      }
      const picked = await expandDropped(raw);
      if (!picked.length) {
        setError("분석할 소스를 찾지 못했습니다. 프로젝트 전체를 zip으로 묶어 올려 주세요.");
        return;
      }
      let files = held;
      let names = roots;
      for (const [root, list] of groupByRoot(picked)) {
        const sources = await toSources(list);
        files = mergeRoot(files, root, sources);
        if (!names.includes(root)) names = [...names, root];
      }
      publish(files, names);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const clearFolders = () => {
    setHeld([]);
    setRoots([]);
    setAnalysis(null);
    setFileLabel("");
    setError("");
  };

  const mergeSources = (incoming: SourceFileIn[]) => {
    let files = held;
    let names = roots;
    const groups = new Map<string, SourceFileIn[]>();
    for (const file of incoming) {
      const root = file.path.split("/")[0] || file.path;
      const list = groups.get(root) || [];
      list.push(file);
      groups.set(root, list);
    }
    for (const [root, list] of groups) {
      files = mergeRoot(files, root, list);
      if (!names.includes(root)) names = [...names, root];
    }
    publish(files, names);
  };

  const readLocalPaths = async (raw: string[]) => {
    const paths = raw.map((p) => p.trim().replace(/^["']+|["']+$/g, "")).filter(Boolean);
    if (!paths.length) {
      setError("읽을 폴더 경로를 넣어 주세요. 예: C:\\work\\EVOC_API");
      return false;
    }
    setError("");
    setBusy("폴더를 읽는 중…");
    try {
      const res = await fetch("/api/read-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const data = (await res.json()) as { error?: string; files?: SourceFileIn[] };
      if (!res.ok || !data.files?.length) {
        setError(data.error || "폴더를 읽지 못했습니다.");
        return false;
      }
      mergeSources(data.files);
      return true;
    } catch {
      setError("폴더를 읽지 못했습니다. 이 프로그램이 돌아가는 PC의 폴더 경로인지 확인하세요.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const runPaste = async () => {
    setError("");
    const raw = [paste, folderPath].filter(Boolean).join("\n");
    const lines = raw.split(/\r?\n/).map((s) => s.trim().replace(/^["']+|["']+$/g, "")).filter(Boolean);
    if (!lines.length) {
      setError("파일 경로나 폴더 경로를 붙여 넣은 뒤 다시 눌러 주세요.");
      return;
    }
    const folders = lines.filter((line) => (/^[a-zA-Z]:[\\/]/.test(line) || line.startsWith("\\\\")) && !/\.[A-Za-z0-9]+$/.test(line));
    const fileText = lines.filter((line) => !folders.includes(line)).join("\n");
    const paths = parsePathList(fileText);

    if (folders.length) {
      const ok = await readLocalPaths(folders);
      if (ok && !paths.length) return;
      if (!ok && !paths.length) return;
    }
    if (!paths.length) {
      setError("파일 경로로 보이는 줄이 없습니다. 폴더 전체 경로나 dir /s /b 결과를 붙여 넣어 주세요.");
      return;
    }
    if (folders.length) {
      mergeSources(paths.map((path) => ({ path })));
      return;
    }
    setFileLabel(`붙여넣기 ${paths.length.toLocaleString()}개 경로`);
    setAnalysis(analyzeSources(paths.map((path) => ({ path }))));
  };

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={step === 1 ? "font-medium text-accent" : ""}>1. 소스 입력</span>
            <span>›</span>
            <span className={step === 2 ? "font-medium text-accent" : ""}>2. 비용 산정 결과</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3.5 w-3.5" /> 처음 화면
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold">기존 시스템 소스 분석 후 공수 산정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현업이 적은 기능과 실제 소스 규모가 맞는지 검증할 때 씁니다. 컴포넌트 파일 수나 JS export로 화면·리포트를 부풀리지 않고, Java API·엔티티는 빠지지 않게 읽습니다. 전문가 FP 산정을 대체하지는 않습니다.
        </p>
      </header>

      {step === 1 ? (
        <div className="space-y-6">
          <Card>
            <Field label="시스템 이름">
              <input className={inputCls} value={title} placeholder="예: 기존 SCM 물류 시스템" onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileUp className="h-4 w-4 text-accent" /> 소스 압축 올리기
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              프로젝트 폴더를 <strong className="font-medium text-foreground">zip 1개</strong>로 묶어 올려 주세요. 브라우저에서 압축을 풀어 소스를 분석합니다.
            </p>
            <p className="mt-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              소스는 <strong className="font-medium text-foreground">견적 산정 시에만</strong> 쓰이며, 서버에 업로드·저장되지 않습니다. 분석은 이 브라우저에서만 이뤄집니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => void pickFile()}>
                <FileUp className="h-4 w-4" /> 압축 1개 올리기
              </button>
              {roots.length > 0 && (
                <button type="button" className="btn-ghost" disabled={!!busy} onClick={clearFolders}>
                  선택 지우기
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void ingestUpload(file);
              }}
            />
            {showDev && (
              <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-foreground">개발자 전용 · 경로에서 읽기</p>
                <p className="text-xs text-muted-foreground">로컬에서 이 프로그램을 띄운 PC의 폴더 경로만 읽을 수 있습니다. 일반 사용자는 zip 업로드를 쓰세요.</p>
                <textarea
                  ref={folderPathRef}
                  className={`${inputCls} font-mono text-xs`}
                  rows={2}
                  value={folderPath}
                  placeholder={"C:\\work\\EVOC_API\nC:\\work\\EVOC_FE"}
                  onChange={(e) => setFolderPath(e.target.value)}
                />
                <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => void readLocalPaths(folderPath.split(/\r?\n/))}>
                  경로에서 읽기
                </button>
              </div>
            )}
            <div
              data-testid="source-drop"
              className={`mt-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm ${over ? "border-accent bg-blue-50 text-foreground" : "border-border text-muted-foreground"}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => void onDrop(e)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!text.trim()) return;
                e.preventDefault();
                setPaste((prev) => (prev ? `${prev}\n${text}` : text));
                if (showDev) setFolderPath((prev) => (prev ? prev : text));
              }}
            >
              zip 파일을 이 칸에 놓으세요. (백엔드·화면 폴더를 한 번에 묶어도 됩니다)
            </div>
            {roots.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                {roots.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
            {busy && <p className="mt-2 text-xs text-muted-foreground">{busy}</p>}
            {fileLabel && <p className="mt-2 text-xs text-muted-foreground">불러옴: {fileLabel}</p>}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListTree className="h-4 w-4 text-accent" /> 또는 파일 목록 붙여넣기
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              경로 목록만으로도 규모를 추정할 수 있습니다. Windows에서는 프로젝트 폴더에서 <code className="rounded bg-muted px-1">dir /s /b</code> 결과를 붙여 넣으세요. 일반 사용자는 위 zip 업로드를 권장합니다.
            </p>
            <textarea className={`${inputCls} mt-3 font-mono text-xs`} value={paste} placeholder={"src/main/java/com/example/UserController.java\nsrc/main/java/com/example/User.java\n..."} onChange={(e) => setPaste(e.target.value)} />
            <button type="button" className="btn-ghost mt-3" onClick={runPaste}>
              목록으로 분석
            </button>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {analysis && (
            <Card>
              <h2 className="text-sm font-semibold">분석 결과</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {analysis.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{analysis.notes.join(" ")}</p>
              <button type="button" className="btn-primary mt-4" onClick={() => { setOverrides({}); setStep(2); }}>
                <Calculator className="h-4 w-4" /> 이 규모로 비용 산정하기
              </button>
            </Card>
          )}
        </div>
      ) : (
        analysis && (
          <ResultView
            channel="source"
            input={input}
            setInput={(p) => setOverrides((prev) => ({ ...prev, ...p }))}
            assumptions={analysis.assumptions}
            backLabel="소스 다시 분석"
            onBack={() => setStep(1)}
            onReset={() => {
              setAnalysis(null);
              setOverrides({});
              setPaste("");
              setFileLabel("");
              setHeld([]);
              setRoots([]);
              setTitle("");
              setStep(1);
            }}
          />
        )
      )}
    </AppShell>
  );
}
