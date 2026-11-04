"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calculator, FileUp, FolderUp, Home, ListTree } from "lucide-react";
import { DEFAULT_INPUT, type EstimateInput } from "@/lib/estimate";
import { analyzeSources, contentPriority, isNoisePath, parsePathList, type SourceAnalysis, type SourceFileIn } from "@/lib/sourceAnalyze";
import AppShell from "@/components/AppShell";
import ResultView from "@/components/ResultView";
import { Card, Field, inputCls } from "@/components/ui";

const TEXT_EXT = /\.(java|kt|xml|jsp|js|jsx|ts|tsx|vue|sql|yml|yaml|properties|html)$/i;
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
  const folderPathRef = useRef<HTMLTextAreaElement>(null);

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
      setError("폴더에서 분석할 소스를 찾지 못했습니다. 깃에서 받은 프로젝트 폴더를 선택해 주세요.");
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

  const addLooseFile = async (picked: Picked[]) => {
    if (!picked.length) return;
    setError("");
    setBusy("파일을 읽는 중…");
    try {
      const sources = await toSources(picked);
      const map = new Map(held.map((f) => [f.path, f]));
      for (const file of sources) map.set(file.path, file);
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
    const openFile = (window as Window & { showOpenFilePicker?: (opts?: { multiple?: boolean }) => Promise<{ getFile: () => Promise<File> }[]> }).showOpenFilePicker;
    if (!openFile) {
      setError("이 브라우저는 파일 창을 열 수 없습니다. 파일을 아래 칸에 놓거나 경로를 붙여 넣으세요.");
      return;
    }
    try {
      const handles = await openFile({ multiple: false });
      const file = await handles[0].getFile();
      await addLooseFile([{ path: file.name, file }]);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "AbortError") return;
      setError("파일 창을 열지 못했습니다. 탐색기에서 파일을 아래 칸에 놓거나 경로를 붙여 넣으세요.");
    }
  };

  const pickFolder = async () => {
    setError("");
    const openPicker = (window as Window & { showDirectoryPicker?: () => Promise<FsNode & { name: string }> }).showDirectoryPicker;
    if (!openPicker) {
      folderPathRef.current?.focus();
      setError("이 브라우저는 폴더 창을 열 수 없습니다. 폴더 경로를 넣고 경로에서 읽기를 누르거나, 폴더를 아래 칸에 놓으세요.");
      return;
    }
    let dir: FsNode & { name: string };
    try {
      dir = await openPicker();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "AbortError") return;
      folderPathRef.current?.focus();
      setError("폴더 창을 열지 못했습니다. 폴더 전체 경로를 넣고 경로에서 읽기를 누르세요.");
      return;
    }
    setBusy(`${dir.name} 폴더를 읽는 중…`);
    try {
      const picked: Picked[] = [];
      await walkHandle(dir, dir.name, picked);
      await addPicked(dir.name, picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    setError("");
    setBusy("놓은 항목을 읽는 중…");
    try {
      const picked = await collectDropped(event.dataTransfer);
      if (!picked.length) {
        setError("놓은 파일·폴더를 읽지 못했습니다. 탐색기에서 폴더를 이 칸에 놓거나, 아래 목록 붙여넣기를 사용하세요.");
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
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했습니다.");
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
              <FolderUp className="h-4 w-4 text-accent" /> 개발 폴더 올리기
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              회사 보안 프로그램이 파일·폴더 창을 가로챕니다. 첨부 창 대신 탐색기에서 아래 칸에 놓거나 목록을 붙여 넣으세요. 폴더 경로 읽기는 이 PC에서 로컬로 띄울 때만 되고, 온라인 배포본에서는 쓸 수 없습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => void pickFile()}>
                <FileUp className="h-4 w-4" /> 파일 추가
              </button>
              <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => void pickFolder()}>
                <FolderUp className="h-4 w-4" /> 폴더 선택
              </button>
              {roots.length > 0 && (
                <button type="button" className="btn-ghost" disabled={!!busy} onClick={clearFolders}>
                  선택 지우기
                </button>
              )}
            </div>
            <div className="mt-3 space-y-2">
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
                setFolderPath((prev) => (prev ? prev : text));
              }}
            >
              탐색기에서 개발 폴더를 이 칸에 놓으세요. API 폴더와 화면 폴더를 함께 놓아도 됩니다.
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
            <p className="mt-1 text-sm text-muted-foreground">Windows: 프로젝트 폴더에서 <code className="rounded bg-muted px-1">dir /s /b</code> 결과를 붙여 넣으세요. 경로만으로도 규모를 추정합니다.</p>
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
