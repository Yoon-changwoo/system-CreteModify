import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { contentPriority, isNoisePath, type SourceFileIn } from "@/lib/sourceAnalyze";

const TEXT_EXT = /\.(java|kt|xml|jsp|js|jsx|ts|tsx|vue|sql|yml|yaml|properties|html)$/i;
const MAX_FILES = 5000;
const MAX_READ = 600;
const MAX_BYTES = 120_000;

type Found = { rel: string; abs: string; size: number };

function cleanPath(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, "").replace(/^\\\\\?\\/, "");
}

async function collect(abs: string, rel: string, found: Found[]) {
  if (found.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (found.length >= MAX_FILES) return;
    const childRel = rel ? `${rel}/${ent.name}` : ent.name;
    if (isNoisePath(childRel)) continue;
    const childAbs = path.join(abs, ent.name);
    if (ent.isDirectory()) {
      await collect(childAbs, childRel, found);
      continue;
    }
    if (!ent.isFile()) continue;
    try {
      const st = await fs.stat(childAbs);
      found.push({ rel: childRel, abs: childAbs, size: st.size });
    } catch {
      /* skip locked files */
    }
  }
}

async function toSources(found: Found[]): Promise<SourceFileIn[]> {
  const ranked = found.sort((a, b) => contentPriority(b.rel) - contentPriority(a.rel)).slice(0, MAX_FILES);
  const out: SourceFileIn[] = [];
  let read = 0;
  for (const it of ranked) {
    const item: SourceFileIn = { path: it.rel, size: it.size };
    if (read < MAX_READ && it.size > 0 && it.size <= MAX_BYTES && TEXT_EXT.test(it.rel)) {
      try {
        item.content = await fs.readFile(it.abs, "utf8");
        read += 1;
      } catch {
        /* keep path */
      }
    }
    out.push(item);
  }
  return out;
}

export async function POST(req: Request) {
  /** Vercel 등 서버리스에서는 사용자 PC 폴더를 읽을 수 없다. 이 PC에서 띄운 로컬 서버만 허용. */
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "온라인 배포 환경에서는 PC 폴더 경로 읽기를 쓸 수 없습니다. 파일·폴더를 끌어다 놓거나, 파일 목록을 붙여 넣어 주세요. (경로 읽기는 이 PC에서 npm run dev 로 띄울 때만 됩니다.)",
      },
      { status: 400 },
    );
  }

  let body: { path?: string; paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "경로를 보내지 못했습니다." }, { status: 400 });
  }
  const raw = Array.isArray(body.paths) ? body.paths : [body.path];
  const inputs = raw.filter((p): p is string => typeof p === "string").map(cleanPath).filter(Boolean);
  if (!inputs.length) {
    return NextResponse.json({ error: "읽을 폴더 경로가 없습니다." }, { status: 400 });
  }

  const roots: string[] = [];
  const files: SourceFileIn[] = [];
  const missing: string[] = [];

  for (const input of inputs) {
    let st;
    try {
      st = await fs.stat(input);
    } catch {
      missing.push(input);
      continue;
    }
    const root = path.basename(path.resolve(input)) || input;
    if (!roots.includes(root)) roots.push(root);
    if (st.isFile()) {
      if (isNoisePath(root)) continue;
      const one = await toSources([{ rel: `${root}/${path.basename(input)}`, abs: input, size: st.size }]);
      files.push(...one);
      continue;
    }
    if (!st.isDirectory()) continue;
    const found: Found[] = [];
    await collect(input, root, found);
    files.push(...(await toSources(found)));
  }

  if (!files.length) {
    const hint = missing.length ? ` 없는 경로: ${missing.join(", ")}` : "";
    return NextResponse.json({ error: `폴더에서 분석할 소스를 찾지 못했습니다.${hint}` }, { status: 404 });
  }

  return NextResponse.json({ roots, files, missing });
}
